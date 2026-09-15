// Authored orbital artwork, rendered with Higgsedit. 8 s / 24 fps / seamless loop.
const glsl = `
mat3 turn(float a, float b) {
  float ca=cos(a),sa=sin(a),cb=cos(b),sb=sin(b);
  return mat3(ca,0.,sa,0.,1.,0.,-sa,0.,ca)*mat3(1.,0.,0.,0.,cb,sb,0.,-sb,cb);
}
vec2 scene(vec3 p) {
  float t=u_time*0.7853981634;
  vec3 q=turn(0.65+0.24*sin(t),0.5+0.18*cos(t))*p;
  vec3 box=abs(q)-vec3(0.34);
  float core=length(max(box,0.))+min(max(box.x,max(box.y,box.z)),0.)-0.06;
  vec2 hit=vec2(core,3.);
  for(int i=0;i<3;i++){
    float f=float(i);
    vec3 r=turn(0.4+f*1.05+0.18*sin(t+f),0.55+f*0.82+0.16*cos(t-f))*p;
    float radius=1.28-f*0.17;
    float ring=length(vec2(length(r.xz)-radius,r.y))-(0.035+f*0.008);
    if(ring<hit.x)hit=vec2(ring,f);
  }
  return hit;
}
vec4 pixel(vec2 uv){
  vec2 st=(uv-0.5)*2.;st.y=-st.y;
  vec3 bg=vec3(0.0353,0.0392,0.0588);
  bg+=vec3(0.027,0.008,0.052)*exp(-3.8*dot(st,st));
  vec3 ro=vec3(0.,0.,5.0);
  vec3 rd=normalize(vec3(st,-2.05));
  float travel=0.;vec2 hit=vec2(1.,0.);
  for(int j=0;j<84;j++){
    hit=scene(ro+rd*travel);
    if(hit.x<0.0013||travel>8.)break;
    travel+=hit.x*0.8;
  }
  vec3 col=bg;
  if(travel<8. && hit.x<0.003){
    vec3 p=ro+rd*travel;
    vec2 e=vec2(0.002,0.);
    vec3 n=normalize(vec3(
      scene(p+e.xyy).x-scene(p-e.xyy).x,
      scene(p+e.yxy).x-scene(p-e.yxy).x,
      scene(p+e.yyx).x-scene(p-e.yyx).x));
    vec3 key=normalize(vec3(-0.7,0.9,1.3));
    vec3 rim=normalize(vec3(1.2,-0.2,0.25));
    vec3 view=-rd;
    float diffuse=max(dot(n,key),0.);
    float side=max(dot(n,rim),0.);
    float shine=pow(max(dot(reflect(-key,n),view),0.),70.);
    float broad=pow(max(dot(reflect(-rim,n),view),0.),15.);
    float fresnel=pow(1.-max(dot(n,view),0.),3.);
    vec3 metal=mix(vec3(0.42,0.3,0.66),vec3(0.74,0.72,0.83),step(0.5,hit.y)*step(hit.y,1.5));
    if(hit.y>2.5)metal=vec3(0.21,0.1,0.40);
    col=metal*(0.12+0.78*diffuse)+vec3(0.25,0.08,0.62)*side*0.75
      +vec3(0.86,0.8,1.)*shine*1.15+vec3(0.4,0.22,0.8)*broad*0.75
      +vec3(0.35,0.2,0.67)*fresnel*0.75;
    col=clamp(col,0.,1.);
  }
  return vec4(col,1.);
}
`;
export default async ({ project }) => {
  const p = await project({
    dir: "orbital",
    size: "640x640",
    fps: 24,
    background: "#090a0f",
  });
  p.compose(
    <rect
      width={640}
      height={640}
      fill="#090a0f"
      effects={[{ kind: "shader", params: { glsl } }]}
    />,
    { dur: 8, name: "Orbital connections" },
  );
  await p.frame(0, "renders/orbital-poster.png");
  await p.render("renders/orbital-loop.mp4", {
    accel: "cpu",
    concurrency: 2,
    bitrate: 1600000,
  });
};
