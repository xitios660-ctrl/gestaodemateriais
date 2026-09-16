import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import TicketForm from '@/pages/TicketForm';
import MaterialCatalogAdmin from './MaterialCatalogAdmin';
import {api} from '@/lib/api';

let mockParams = {};
jest.mock('@/lib/api',()=>({api:{get:jest.fn(),post:jest.fn(),put:jest.fn()},formatApiErrorDetail:()=> 'Erro'}));
jest.mock('react-router-dom',()=>({useParams:()=>mockParams,useNavigate:()=>jest.fn()}), {virtual:true});
jest.mock('@/components/SiteHeader',()=>({SiteHeader:()=>null}));
jest.mock('sonner',()=>({toast:{success:jest.fn(),error:jest.fn()}}));
const cats=[{id:'cat-drop',name:'Drop',lead_time_hours:24,fields:[],materials:[{id:'drop',name:'Drop Externo',measure:'metro',multiple:500}]},{id:'cat-hgu',name:'HGU',lead_time_hours:48,fields:[],materials:[{id:'hgu',name:'HGU Wi-Fi',measure:'unidade',multiple:1}]}];
let host,root;
beforeEach(()=>{
  global.IS_REACT_ACT_ENVIRONMENT=true;
  window.matchMedia=()=>({matches:true,addListener(){},removeListener(){}});
  window.scrollTo=jest.fn();
  host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
  jest.clearAllMocks();
  mockParams = {};
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
const button=text=>[...document.querySelectorAll('button')].find(node=>node.textContent.includes(text));
const click=async node=>{expect(node).toBeTruthy();await act(async()=>node.click());};
const fill=async(selector,value)=>{
  const element=document.querySelector(selector);expect(element).toBeTruthy();
  await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(element,value);element.dispatchEvent(new Event('input',{bubbles:true}));});
};

test('kit stepper, input snapping, review and one consolidated request',async()=>{
  api.get.mockResolvedValue({data:cats});
  api.post.mockResolvedValue({data:{ticket_number:'CH-QA-0001',lead_time_hours:48,material_items:[]}});
  await act(async()=>root.render(<TicketForm/>));
  await click(document.querySelector('[aria-label="Aumentar Drop Externo"]'));
  expect(document.querySelector('#quantity-drop').value).toBe('500');
  await fill('#quantity-drop','750');
  await act(async()=>document.querySelector('#quantity-drop').dispatchEvent(new FocusEvent('focusout',{bubbles:true})));
  expect(document.querySelector('#quantity-drop').value).toBe('1000');
  await click(document.querySelector('[aria-label="Aumentar HGU Wi-Fi"]'));
  await fill('#requester-matricula','QA01');await fill('#requester-empresa','Empresa QA');await fill('#requester-email','qa@example.com');
  await act(async()=>document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(api.post).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain('Confirme sua solicitação');
  expect(document.body.textContent).toContain('1.000 m');
  await click(button('Confirmar e enviar chamado'));
  expect(api.post).toHaveBeenCalledTimes(1);
  const payload=JSON.parse(api.post.mock.calls[0][1].get('payload'));
  expect(payload.kind).toBe('kit');
  expect(payload.material_items).toEqual([{category_id:'cat-drop',item_id:'drop',quantity:1000},{category_id:'cat-hgu',item_id:'hgu',quantity:1}]);
  expect(document.body.textContent).toContain('CH-QA-0001');
});

test('Excel/CSV upload is previewed before confirmed multipart import',async()=>{
  const preview={valid:true,categories_created:0,items_created:1,skipped:0,errors:[],entries:[{row:2,category:'Drop',name:'Interno',measure:'metro',multiple:100,action:'criar',category_active:true}]};
  api.post.mockResolvedValue({data:preview});
  await act(async()=>root.render(<MaterialCatalogAdmin categories={cats} onChange={jest.fn()} onCreateCategory={jest.fn()}/>));
  const upload=document.querySelector('input[type=file]');const file=new File(['Categoria Pai;Sub-item (Filho);Tipo de Medida;Múltiplo\nDrop;Interno;Metro;100'],'materiais.csv',{type:'text/csv'});
  await act(async()=>{Object.defineProperty(upload,'files',{value:[file],configurable:true});upload.dispatchEvent(new Event('change',{bubbles:true}));});
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.post.mock.calls[0][1].get('preview')).toBe('true');
  expect(api.post.mock.calls[0][2].headers['Content-Type']).toBe('multipart/form-data');
  expect(document.body.textContent).toContain('Interno');
  await click(button('Confirmar importação'));
  expect(api.post).toHaveBeenCalledTimes(2);
  expect(api.post.mock.calls[1][1].get('preview')).toBe('false');
  expect(api.post.mock.calls[1][1].get('file').name).toBe('materiais.csv');
});


test('linked category kit loads only configured catalogs and keeps the service category',async()=>{
  mockParams = {categoryId:'service-kit'};
  const service={
    id:'service-kit',
    name:'Instalação HGU',
    icon:'Package',
    lead_time_hours:8,
    fields:[],
    materials:[],
    kit_enabled:true,
    kit_catalog_ids:['cat-hgu'],
  };
  api.get.mockImplementation((url)=>{
    if(url==='/categories/service-kit') return Promise.resolve({data:service});
    if(url==='/categories') return Promise.resolve({data:cats});
    return Promise.reject(new Error('unexpected url'));
  });
  api.post.mockResolvedValue({data:{
    ticket_number:'CH-QA-0002',
    lead_time_hours:8,
    material_items:[{category_name:'HGU',name:'HGU Wi-Fi',measure:'unidade',quantity:2}],
  }});

  await act(async()=>root.render(<TicketForm/>));

  expect(document.body.textContent).toContain('Monte os materiais deste chamado');
  expect(document.body.textContent).toContain('HGU Wi-Fi');
  expect(document.body.textContent).not.toContain('Drop Externo');

  await click(document.querySelector('[aria-label="Aumentar HGU Wi-Fi"]'));
  await click(document.querySelector('[aria-label="Aumentar HGU Wi-Fi"]'));
  await fill('#requester-matricula','QA02');
  await fill('#requester-empresa','Operações');
  await fill('#requester-email','qa2@example.com');

  await act(async()=>document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(document.body.textContent).toContain('Confirme sua solicitação');
  await click(button('Confirmar e enviar chamado'));

  const payload=JSON.parse(api.post.mock.calls[0][1].get('payload'));
  expect(payload.kind).toBe('standard');
  expect(payload.category_id).toBe('service-kit');
  expect(payload.material_items).toEqual([{category_id:'cat-hgu',item_id:'hgu',quantity:2}]);
});
