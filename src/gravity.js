
var vertexShader = `
precision highp float;

uniform vec4 lowColor;
uniform vec4 highColor;
uniform float pointSize;
uniform vec2 center;
uniform float deltaTime;
uniform mat3 modelView;

attribute vec2 position;
attribute float potential;
attribute vec2 gradient;
attribute vec2 velocity;

varying float vPotential;
varying vec2 vGradient;
varying vec2 vVelocity;
void main() {
  gl_Position = vec4(modelView * vec3(position, 1.0), 1.0);
  gl_PointSize = pointSize;
  // gl_PointSize = 10.;

  vPotential = potential;
  vGradient = gradient;
  vVelocity = velocity;
}
`;

var fragmentShader = `
#define PI 3.14159265359

precision highp float;

uniform vec4 lowColor;
uniform vec4 highColor;
uniform vec2 size;
uniform highp int time;

varying float vPotential;
varying vec2 vGradient;
varying vec2 vVelocity;

float scale(float x) {
  return 1. + 1. / (1. + x);
}

void main() {
  // gl_FragColor = mix(lowColor, highColor, scale(vPotential));
  // gl_FragColor = vec4(0.,0.,0.,0.5);
  float r = gl_FragCoord.y / size.y;
  float g = gl_FragCoord.x / size.x;
  // float b = (1.0 - r);
  // if (g != 0.) b /= g;

  float t = float(time);

  float b = 0.5 * (1. + cos(PI * t / 1000.));

  gl_FragColor = vec4(0., 0., b, 1.);
}
`;

function createShader(gl, str, type) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, str);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}
function createProgram(gl, vertex_shader, fragment_shader) {
  var program = gl.createProgram();
  var vshader = createShader(gl, vertex_shader, gl.VERTEX_SHADER);
  var fshader = createShader(gl, fragment_shader, gl.FRAGMENT_SHADER);
  gl.attachShader(program, vshader);
  gl.attachShader(program, fshader);
  gl.linkProgram(program);
  return program;
}

export default class Gravity {
  constructor(parent) {
    this.parent = parent;
    this.init();
  }
  init() {
    this.el = document.createElement('canvas');
    this.parent.appendChild(this.el);

    this.size = 20;
    this.initial = [
      {x: 0, y: 0, m: 1.0}
    ];
    this.lowColor = [0.0, 0.0, 1.0, 1.0];
    this.highColor = [1.0, 0.0, 0.0, 1.0];
    this.deltaTime = 0.001;

    this.gl = this.el.getContext("webgl") || this.el.getContext("expirimental-webgl");
    this.gl.uint_ext = this.gl.getExtension("OES_element_index_uint");

    this.resizer = () => this.handleResize();
    window.addEventListener('resize', this.resizer);
    this.handleResize();
    // this.gl.clearColor(0.1,0.9,0.9,0.5);
    // this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.setupProgram();
    this.setupData();
    this.setupBuffers();

    this.play();
  }
  setupProgram() {
    this.program = createProgram(this.gl, vertexShader, fragmentShader);

    this.locations = {};
    ['lowColor', 'highColor', 'pointSize', 'center', 'deltaTime', 'size', 'time', 'modelView'].forEach(v => {
      this.locations[v] = this.gl.getUniformLocation(this.program, v)
      console.log('uniform', v, this.locations[v]);
    });
    ['position', 'potential', 'gradient', 'velocity'].forEach(a => {
      this.locations[a] = this.gl.getAttribLocation(this.program, a);
      this.gl.enableVertexAttribArray(this.locations[a]);
    });
  }
  setupData() {
    this.data = {};
    this.data.potential = new Array(this.size * this.size);
    this.data.positions = new Array(2 * this.size * this.size);
    this.data.gradient = new Array(2 * this.size * this.size);
    this.data.velocity = new Array(2 * this.size * this.size);
    this.data.elements = new Array(this.size * this.size);

    for(var row = 0; row < this.size; row++) {
      for(var col = 0; col < this.size; col++) {
        this.data.positions[2 * this.size * row + 2 * col + 0] = 2.0 * col / this.size - 1.0;
        this.data.positions[2 * this.size * row + 2 * col + 1] = 2.0 * row / this.size - 1.0;

        this.data.potential[this.size * row + col] = 1.0;

        this.data.gradient[2 * this.size * row + 2 * col + 0] = 0.0;
        this.data.gradient[2 * this.size * row + 2 * col + 1] = 0.0;

        this.data.velocity[2 * this.size * row + 2 * col + 0] = 0.0;
        this.data.velocity[2 * this.size * row + 2 * col + 1] = 0.0;

        this.data.elements[this.size * row + col] = this.size * row + col;
      }
    }
    console.log('data length', this.data.elements.length);

    // console.log(this.data.elements);
    // console.log(this.data.potential);
    console.log(this.data.positions);
    // console.log(this.data.gradient);
    // console.log(this.data.velocity);
  }
  setupBuffers() {
    this.buffers = {};
    ['positions', 'gradient', 'velocity', 'potential'].forEach(a => {
      console.log('setting up buffers.' + a);
      this.buffers[a] = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers[a]);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.data[a]), this.gl.STATIC_DRAW);
    });
    this.buffers.elements = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.elements);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.data.elements), this.gl.STATIC_DRAW);
  }
  handleResize() {
    this.width = this.parent.offsetWidth;
    this.height = this.parent.offsetHeight;
    console.log(this.gl.getParameter(this.gl.VIEWPORT));
    this.el.setAttribute('width', this.width + 'px');
    this.el.setAttribute('height', this.height + 'px');


    this.gl.viewport(0, 0, this.width, this.height);
    // this.gl.viewport(-1., -1., 1., 1.);

    this.pointSize = this.width > this.height ? this.height / this.size : this.width / this.size;
    console.log('pointSize', this.pointSize);
    this.center = [this.width / 2.0, this.height / 2.0];
  }
  render() {
    // console.log('rendering.');
    if (!this.stopped) {
      requestAnimationFrame(() => this.render());
    }

    // this.gl.clearColor(0.1,0.9,0.9,0.5);
    // this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    var t = new Date().getTime();
    // console.log('time', t);
    if (!this.lastTime) this.lastTime = t

    var deltaTime = this.deltaTime * (t - this.lastTime);


    this.gl.useProgram(this.program);

    this.gl.uniform1f(this.locations.pointSize, this.pointSize);
    this.gl.uniform1f(this.locations.deltaTime, this.deltaTime);
    this.gl.uniform4fv(this.locations.lowColor, new Float32Array(this.lowColor));
    this.gl.uniform4fv(this.locations.highColor, new Float32Array(this.highColor));
    this.gl.uniform2fv(this.locations.center, new Float32Array([0.5, 0.5]));
    this.gl.uniform2fv(this.locations.size, new Float32Array([this.width, this.height]));
    this.gl.uniform1i(this.locations.time, t);
    this.gl.uniformMatrix3fv(this.locations.modelView, false, new Float32Array([
      0.5, 0., 0.,
      0., 0.5, 0.,
      0., 0., 1.
    ]));

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.potential);
    this.gl.vertexAttribPointer(this.locations.potential, 1, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.positions);
    this.gl.vertexAttribPointer(this.locations.positions, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.gradient);
    this.gl.vertexAttribPointer(this.locations.gradient, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.velocity);
    this.gl.vertexAttribPointer(this.locations.velocity, 2, this.gl.FLOAT, false, 0, 0);

    // this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.positions);
    // this.gl.drawArrays(this.gl.POINTS, 0, this.buffers.positions.length / 2);
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.elements);
    this.gl.drawElements(this.gl.POINTS, this.size * this.size, this.gl.UNSIGNED_INT, 0);

  }
  stop() {
    this.stopped = true;
  }
  play() {
    this.lastTime = new Date().getTime();
    this.stopped = false;
    this.render();
  }
  destroy() {
    window.removeEventListener('resize', this.resizer);
    this.parent.removeChild(this.el);
    delete this.el;
    delete this.parent;
  }
}
