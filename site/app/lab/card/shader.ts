// projected canopy shadow on the card; modes 0 leaves, 1 edge, 2 paper, 3+ cast (white ground for multiply)
// canopy atlas: left panel in x 0..0.5 grows in from the left edge, right panel in 0.5..1 from the right;
// each panel is one unit wide and two tall, red holds the near layer, green the far one
export const vertex = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0., 1.); }
`;

export const fragment = `#version 300 es
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float mode;
uniform float strength;
uniform float scale;
uniform float balance;
uniform float reach;
uniform float soft;
uniform float depth;
uniform float warmth;
uniform vec4 grain;
uniform float tint;
uniform sampler2D canopy;
out vec4 color;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
}
// branches rock about the edge they grow from, so tips travel furthest; leaves flutter on their own
vec2 bend(vec2 q, float t, float k) {
  float rock = noise(vec2(t*.13,q.y*1.4+k))-.5;
  float gust = noise(vec2(t*.05,k+4.))-.5;
  float flutter = noise(q*9.+vec2(t*.45,-t*.33)+k)-.5;
  return q+vec2(gust*.03,rock*.05)*q.x+flutter*.005;
}
void main() {
  vec2 uv = vec2(gl_FragCoord.x, resolution.y-gl_FragCoord.y)/resolution;
  // one unit tracks the card, so leaves keep their size relative to it on any screen
  float unit = min(resolution.y,resolution.x*1.2)*scale;
  float right = step(.5,uv.x);
  float edge = mix(gl_FragCoord.x,resolution.x-gl_FragCoord.x,right);
  vec2 q = vec2(min(edge/unit,.99),(resolution.y-gl_FragCoord.y)/unit);
  vec2 a = bend(q,time,0.), b = bend(q,time*.8,7.);
  // penumbra widens down the card; the far layer hangs higher, so it is blurrier and paler
  float rn = soft*(.003+.002*q.y), rf = soft*.016;
  float near = 0., far = 0.;
  for (int i=0;i<12;i++) {
    float t = float(i)*2.399963;
    vec2 o = vec2(cos(t),sin(t))*sqrt((float(i)+.5)/12.);
    vec2 n = a+o*rn, f = b+o*rf;
    near += texture(canopy,vec2(mix(n.x,2.-n.x,right)*.5,n.y*.5)).r;
    far += textureLod(canopy,vec2(mix(f.x,2.-f.x,right)*.5,f.y*.5),2.).g;
  }
  float shade = 1.-(1.-near/12.)*(1.-far/12.*depth*.55);
  // soft falloff toward the centre column, its edge wandering so no straight line shows; sides weighted by balance
  float side = 1.-smoothstep(0.,reach,1.-abs(uv.x-.5)*2.+(noise(vec2(uv.y*2.5,right*9.))-.5)*.35*reach);
  side *= mix(1.-max(balance,0.),1.+min(balance,0.),right);
  side *= (1.-smoothstep(.9,.99,q.x))*(1.-smoothstep(1.8,1.98,q.y));
  float glow = 1.-smoothstep(0.,.75,length((uv-vec2(.8,.12))*vec2(.7,1.)));
  vec3 ink = clamp(mix(vec3(.34,.38,.45),vec3(.48,.35,.23),warmth),0.,1.);
  vec3 light = mix(vec3(1.),vec3(1.,.945,.83),clamp(warmth,0.,1.)*.30);
  // cast multiplies over the card and terminal, so its ground is pure white
  vec3 ground = mode > 2.5 ? vec3(1.) : mix(vec3(.984,.980,.969),vec3(.935,.952,.972),tint);
  vec3 result = mix(ground*light,ink,clamp(shade*strength*side,0.,.6));
  result = mix(result,vec3(1.),glow*.10);
  vec2 t = gl_FragCoord.xy/grain.z;
  result += (hash(floor(gl_FragCoord.xy))-.5)*.013;
  result += (noise(t*.9)-.5)*.045*grain.x+(noise(vec2(t.x*.12,t.y*2.2))-.5)*.02*grain.y;
  result *= 1.-.10*grain.w*length(uv-.5);
  color = vec4(result,1.);
}
`;
