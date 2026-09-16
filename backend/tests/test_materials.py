"""Import and kit regression tests use isolated storage and never send email."""
import asyncio
import csv
import io
import json
from unittest.mock import AsyncMock
import pytest
from bson import ObjectId
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient
from openpyxl import Workbook
import server
from database import _matches
from materials import HEADERS, CATALOG_HEADERS, save_materials

@pytest.fixture
def ctx(monkeypatch):
    db = AsyncMongoMockClient().materials_test
    monkeypatch.setattr(server, 'db', db)
    for name in ('enforce_rate_limit','notify_owners','send_ticket_opened_email','send_status_update_email'):
        monkeypatch.setattr(server, name, AsyncMock())
    actor = {'_id': str(ObjectId()), 'role':'admin', 'email':'qa@example.com', 'name':'QA'}
    server.app.dependency_overrides[server.get_current_user] = lambda: actor
    server.app.dependency_overrides[server.require_admin] = lambda: actor
    api = TestClient(server.app)
    yield api,db,actor
    server.app.dependency_overrides.clear()
    api.close()

def upload(api, rows, preview=True, fmt='csv', encoding='utf-8-sig', delimiter=';'):
    if fmt == 'xlsx':
        wb=Workbook()
        for row in [HEADERS,*rows]: wb.active.append(row)
        stream=io.BytesIO(); wb.save(stream); raw=stream.getvalue()
    else:
        stream=io.StringIO(); csv.writer(stream,delimiter=delimiter).writerows([HEADERS,*rows]); raw=stream.getvalue().encode(encoding)
    return api.post('/api/materials/import',data={'preview':str(preview).lower()},files={'file':('catalog.'+fmt,raw)})

def cat(api,name='Drop',**extra):
    r=api.post('/api/categories',json={'name':name,**extra}); assert r.status_code==200,r.text
    return r.json()

def item(api,c,name='Drop Externo',measure='metro',multiple=500):
    r=api.post(f"/api/categories/{c['id']}/materials",json={'name':name,'measure':measure,'multiple':multiple}); assert r.status_code==200,r.text
    return r.json()

def entry(c,i,q): return {'category_id':c['id'],'item_id':i['id'],'quantity':q}

def catalog(api):
    r=api.post('/api/material-catalogs'); assert r.status_code==200,r.text
    return r.json()

def catalog_item(api,c,name='HGU5 CV',measure='unidade',multiple=1):
    r=api.post(f"/api/material-catalogs/{c['id']}/materials",json={'name':name,'measure':measure,'multiple':multiple})
    assert r.status_code==200,r.text
    return r.json()

def upload_catalog(api,catalog_id,rows,preview=True,fmt='csv'):
    if fmt == 'xlsx':
        wb=Workbook()
        for row in [CATALOG_HEADERS,*rows]: wb.active.append(row)
        stream=io.BytesIO(); wb.save(stream); raw=stream.getvalue()
    else:
        stream=io.StringIO(); csv.writer(stream,delimiter=';').writerows([CATALOG_HEADERS,*rows]); raw=stream.getvalue().encode('utf-8-sig')
    return api.post(
        f"/api/material-catalogs/{catalog_id}/import",
        data={'preview':str(preview).lower()},
        files={'file':('catalog.'+fmt,raw)},
    )

def submit(api,items=None,**extra):
    data={'kind':'kit','material_items':items,'requester':{'matricula':'QA01','email':'qa@example.com','empresa':'QA'},'field_values':{},**extra}
    return api.post('/api/tickets',data={'payload':json.dumps(data)})

@pytest.mark.parametrize('fmt,encoding,delimiter',[('xlsx','utf-8',';'),('csv','utf-8-sig',';'),('csv','cp1252',','),('csv','utf-8','\t')])
def test_import_preview_and_idempotent_retry(ctx,fmt,encoding,delimiter):
    api,db,_=ctx
    rows=[['Drop','Externo','Metro',500],['HGU','Óptico','Unidade',''],['Drop','Interno','Metro',100]]
    r=upload(api,rows,fmt=fmt,encoding=encoding,delimiter=delimiter)
    assert r.status_code==200 and r.json()['valid'],r.text
    assert asyncio.run(db.categories.count_documents({}))==0
    r=upload(api,rows,False,fmt,encoding,delimiter).json()
    assert r['items_created']==3 and r['categories_created']==2
    r=upload(api,rows,False,fmt,encoding,delimiter).json()
    assert r['items_created']==0 and r['skipped']==3
    assert asyncio.run(db.categories.count_documents({}))==2

@pytest.mark.parametrize('bad',[['Drop','Externo','Metro',''],['Drop','Externo','Metro',0],['Drop','Externo','Metro',2.5],['Drop','Externo','Kg',1],['Drop','','Unidade',1],['','Cabo','Metro',100],['Drop','Cabo','Metro','NaN']])
def test_invalid_row_blocks_all_writes_with_line_number(ctx,bad):
    api,db,_=ctx
    r=upload(api,[['HGU','Bom','Unidade',1],bad],False).json()
    assert not r['valid'] and r['errors'][0]['row']==3
    assert asyncio.run(db.categories.count_documents({}))==0

def test_duplicates_conflicts_and_metadata_preserved(ctx):
    api,_,_=ctx
    c=cat(api,owners=['owner@example.com'],fields=[{'id':'f','label':'Obs','type':'text'}],template_columns=['Coluna'])
    i=item(api,c)
    r=upload(api,[['Drop','Interno','Metro',100],[' drop ','INTERNO','Metro',100]],False).json()
    assert r['items_created']==1 and r['skipped']==1
    r=upload(api,[['HGU','Novo','Unidade',1],['Drop','Interno','Metro',500]],False).json()
    assert not r['valid'] and len(api.get('/api/categories').json())==1
    r=api.put(f"/api/categories/{c['id']}",json={'name':'Drop','owners':['owner@example.com'],'fields':c['fields'],'template_columns':['Coluna']}).json()
    assert r['materials'][0]['id']==i['id'] and len(r['materials'])==2
    assert r['fields']==c['fields'] and r['template_columns']==['Coluna']
    assert 'owners' not in api.get(f"/api/categories/{c['id']}").json()

@pytest.mark.parametrize('bad',[0,-1,1,499,501,750,500.5,'500',True,None,1000000500])
def test_server_rejects_invalid_multiples(ctx,bad):
    api,db,_=ctx; c=cat(api); i=item(api,c)
    assert submit(api,[entry(c,i,bad)]).status_code==400
    assert asyncio.run(db.tickets.count_documents({}))==0

@pytest.mark.parametrize('q',[500,1000,1500])
def test_valid_multiples(ctx,q):
    api,_,_=ctx; c=cat(api); i=item(api,c)
    r=submit(api,[entry(c,i,q)])
    assert r.status_code==200,r.text
    assert r.json()['material_items'][0]['quantity']==q

def test_multi_category_history_permissions_report_and_privacy(ctx):
    api,db,actor=ctx
    drop=cat(api,lead_time_hours=24); hgu=cat(api,'HGU',lead_time_hours=48); other=cat(api,'Outro')
    cable=item(api,drop); router=item(api,hgu,'Roteador','unidade',500)
    assert router['multiple']==1
    r=submit(api,[entry(drop,cable,1500),entry(hgu,router,3)]); assert r.status_code==200,r.text
    t=r.json(); assert len(t['material_items'])==2 and t['lead_time_hours']==48
    api.put(f"/api/categories/{drop['id']}/materials/{cable['id']}",json={'name':'Renomeado','measure':'metro','multiple':100})
    saved=api.get(f"/api/tickets/{t['id']}").json()['material_items'][0]
    assert saved['name']=='Drop Externo' and saved['multiple']==500
    assert '1500 m' in api.get('/api/admin/reports/tickets.csv').text
    assert 'material_items' not in api.get('/api/tickets/track',params={'q':t['ticket_number']}).json()[0]
    actor.update(role='responsavel',categories=[hgu['id']])
    assert api.get(f"/api/tickets/{t['id']}").status_code==200
    assert len(api.get('/api/tickets',params={'category_id':hgu['id'],'search':'QA01'}).json())==1
    assert api.get('/api/tickets',params={'category_id':other['id']}).json()==[]
    assert api.get('/api/admin/stats').json()['total']==1
    assert _matches(t,server.build_ticket_query(actor,category_id=hgu['id'],search='QA01'))
    actor['categories']=[other['id']]
    assert api.get(f"/api/tickets/{t['id']}").status_code==404
    assert api.get('/api/tickets').json()==[]
    assert not _matches(t,server.scope_match(actor))

def test_inactive_duplicate_wrong_category_and_empty_kit(ctx):
    api,_,_=ctx; c=cat(api); i=item(api,c); other=cat(api,'Outro')
    for entries in [[],[entry(c,i,500)]*2,[entry(other,i,500)]]:
        assert submit(api,entries).status_code==400
    assert submit(api,[],kind='standard',category_id=c['id']).status_code==400
    assert submit(api,[entry(c,i,500)],kind='standard',category_id=other['id']).status_code==400
    api.put(f"/api/categories/{c['id']}/materials/{i['id']}",json={'name':i['name'],'measure':'metro','multiple':500,'active':False})
    assert api.get(f"/api/categories/{c['id']}").json()['materials']==[]
    assert submit(api,[entry(c,i,500)]).status_code==400

def test_legacy_dependent_fields_and_kit_requirements(ctx):
    api,_,_=ctx
    field={'id':'f','label':'Tipo','type':'dependent_select','required':True,'dependent_options':[{'parent':'A','children':['B']}]}
    c=cat(api,fields=[field])
    assert submit(api,kind='standard',category_id=c['id'],field_values={'Tipo':{'parent':'A','child':'B'}}).status_code==200
    assert submit(api,kind='standard',category_id=c['id'],field_values={'Tipo':{'parent':'A','child':'X'}}).status_code==400
    i=item(api,c)
    assert submit(api,[entry(c,i,500)]).status_code==400
    assert submit(api,[entry(c,i,500)],field_values={'Drop — Tipo':{'parent':'A','child':'B'}}).status_code==200

def test_admin_required(ctx):
    api,_,_=ctx; c=cat(api)
    server.app.dependency_overrides.clear()
    assert upload(api,[['Drop','Cabo','Metro',500]]).status_code==401
    assert api.get('/api/materials/template').status_code==401
    assert api.post(f"/api/categories/{c['id']}/materials",json={'name':'Cabo'}).status_code==401
    server.app.dependency_overrides[server.get_current_user]=lambda:{'role':'responsavel','categories':[c['id']]}
    assert upload(api,[['Drop','Cabo','Metro',500]]).status_code==403

@pytest.mark.parametrize('fmt',['xlsx','csv'])
def test_template_roundtrip(ctx,fmt):
    api,_,_=ctx; r=api.get('/api/materials/template',params={'format':fmt}); assert r.status_code==200
    r=api.post('/api/materials/import',files={'file':('modelo.'+fmt,r.content)})
    assert r.status_code==200 and r.json()['valid'] and r.json()['items_created']==3

def test_corrupt_excel_formulas_and_concurrent_edits(ctx):
    api,db,_=ctx
    assert api.post('/api/materials/import',files={'file':('bad.xlsx',b'not a zip')}).status_code==400
    assert upload(api,[['Drop','Cabo','Metro','=500']],fmt='xlsx').status_code==400
    assert not upload(api,[['Drop','Cabo','Metro','=500']]).json()['valid']
    c=cat(api); before=asyncio.run(db.categories.find_one({'_id':ObjectId(c['id'])})); i=item(api,c)
    with pytest.raises(Exception) as exc: asyncio.run(save_materials(db,before,[]))
    assert exc.value.status_code==409
    assert api.get(f"/api/categories/{c['id']}").json()['materials'][0]['id']==i['id']

@pytest.mark.parametrize('value',[{'name':'Cabo','measure':'metro'},{'name':'Cabo','measure':'metro','multiple':1.5},{'name':'Cabo','measure':'metro','multiple':True}])
def test_manual_meter_requires_explicit_integer_multiple(ctx,value):
    api,_,_=ctx;c=cat(api)
    assert api.post(f"/api/categories/{c['id']}/materials",json=value).status_code==422

def test_large_catalog_import_and_retry(ctx):
    api,_,_=ctx
    rows=[['Drop',f'Cabo {i}','Metro',100] for i in range(5000)]
    result=upload(api,rows,False).json()
    assert result['valid'] and result['items_created']==5000
    retry=upload(api,rows,False).json()
    assert retry['items_created']==0 and retry['skipped']==5000


def test_batch_material_creation_is_atomic(ctx):
    api, db, _ = ctx
    c = cat(api, 'HGU')
    payload = {
        'items': [
            {'name': 'HGU5 CV', 'measure': 'unidade', 'multiple': 99, 'active': True},
            {'name': 'HGU5 SV', 'measure': 'unidade', 'active': True},
            {'name': 'Cabo Drop', 'measure': 'metro', 'multiple': 500, 'active': True},
        ]
    }
    r = api.post(f"/api/categories/{c['id']}/materials/batch", json=payload)
    assert r.status_code == 200, r.text
    assert r.json()['created'] == 3
    saved = api.get(f"/api/categories/{c['id']}").json()['materials']
    assert [item['name'] for item in saved] == ['HGU5 CV', 'HGU5 SV', 'Cabo Drop']
    assert saved[0]['multiple'] == 1
    assert saved[2]['multiple'] == 500

    before = asyncio.run(db.categories.find_one({'_id': ObjectId(c['id'])}))
    duplicate = api.post(
        f"/api/categories/{c['id']}/materials/batch",
        json={'items': [
            {'name': 'Novo', 'measure': 'unidade'},
            {'name': ' novo ', 'measure': 'metro', 'multiple': 100},
        ]},
    )
    assert duplicate.status_code == 409
    after = asyncio.run(db.categories.find_one({'_id': ObjectId(c['id'])}))
    assert after['materials'] == before['materials']

    existing = api.post(
        f"/api/categories/{c['id']}/materials/batch",
        json={'items': [
            {'name': 'Outro', 'measure': 'unidade'},
            {'name': 'HGU5 CV', 'measure': 'unidade'},
        ]},
    )
    assert existing.status_code == 409
    final = asyncio.run(db.categories.find_one({'_id': ObjectId(c['id'])}))
    assert final['materials'] == before['materials']


def test_batch_material_creation_requires_admin(ctx):
    api, _, _ = ctx
    c = cat(api, 'HGU')
    server.app.dependency_overrides.clear()
    server.app.dependency_overrides[server.get_current_user] = lambda: {'role': 'responsavel', 'categories': [c['id']]}
    r = api.post(
        f"/api/categories/{c['id']}/materials/batch",
        json={'items': [{'name': 'HGU5 CV', 'measure': 'unidade'}]},
    )
    assert r.status_code == 403


def test_standalone_catalog_import_never_creates_category(ctx):
    api,db,_=ctx
    catalog_doc=catalog(api)
    assert catalog_doc['name']=='Catálogo 1'
    preview=upload_catalog(api,catalog_doc['id'],[['HGU5 CV','Unidade',1],['Drop 500','Metro',500]],True).json()
    assert preview['valid'] and preview['items_created']==2
    assert asyncio.run(db.categories.count_documents({}))==0
    saved=upload_catalog(api,catalog_doc['id'],[['HGU5 CV','Unidade',1],['Drop 500','Metro',500]],False).json()
    assert saved['items_created']==2
    assert asyncio.run(db.categories.count_documents({}))==0
    catalogs=api.get('/api/material-catalogs').json()
    assert len(catalogs)==1 and len(catalogs[0]['materials'])==2


def test_category_kit_accepts_only_linked_catalogs(ctx):
    api, db, _ = ctx
    linked_catalog = catalog(api)
    linked_item = catalog_item(api, linked_catalog, 'HGU5 CV', 'unidade', 1)
    other_catalog = catalog(api)
    other_item = catalog_item(api, other_catalog, 'Drop 500', 'metro', 500)

    service = cat(
        api,
        'Instalação HGU',
        kit_enabled=True,
        kit_catalog_ids=[linked_catalog['id']],
        lead_time_hours=8,
    )

    ok = submit(
        api,
        [entry(linked_catalog, linked_item, 3)],
        kind='standard',
        category_id=service['id'],
    )
    assert ok.status_code == 200, ok.text
    saved = ok.json()
    assert saved['category_id'] == service['id']
    assert saved['category_name'] == 'Instalação HGU'
    assert saved['category_ids'] == [service['id']]
    assert saved['kind'] == 'standard'
    assert saved['material_items'][0]['category_id'] == linked_catalog['id']
    assert saved['material_items'][0]['quantity'] == 3

    denied = submit(
        api,
        [entry(other_catalog, other_item, 500)],
        kind='standard',
        category_id=service['id'],
    )
    assert denied.status_code == 400
    assert 'catálogos vinculados' in denied.text

    empty = submit(api, [], kind='standard', category_id=service['id'])
    assert empty.status_code == 400
    assert asyncio.run(db.tickets.count_documents({})) == 1


def test_category_kit_requires_existing_catalog_with_active_items(ctx):
    api, _, _ = ctx
    empty_catalog = catalog(api)
    response = api.post('/api/categories', json={
        'name': 'Serviço Kit',
        'kit_enabled': True,
        'kit_catalog_ids': [empty_catalog['id']],
    })
    assert response.status_code == 400
    assert 'catálogos' in response.text.lower()

    no_link = api.post('/api/categories', json={
        'name': 'Serviço sem vínculo',
        'kit_enabled': True,
        'kit_catalog_ids': [],
    })
    assert no_link.status_code == 400
    assert 'vincule' in no_link.text.lower()



def test_category_owners_are_notified_with_admins(ctx, monkeypatch):
    api, _, _ = ctx
    monkeypatch.setattr(
        server,
        'get_all_admin_notification_emails',
        AsyncMock(return_value=['admin@example.com']),
    )
    owner = 'owner@telefonica.com'
    category = cat(api, 'Com Owners', owners=[owner])

    response = submit(
        api,
        [],
        kind='standard',
        category_id=category['id'],
    )
    assert response.status_code == 200, response.text

    assert server.notify_owners.await_count == 1
    recipients = server.notify_owners.await_args.args[1]
    assert owner in recipients
    assert 'admin@example.com' in recipients
