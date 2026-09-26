/**
 * Types WebGPU, réduits à ce que `src/lib/chess` et `src/lib/gpu` appellent.
 *
 * TypeScript 5.9 ne les fournit pas encore et `@webgpu/types` serait une
 * dépendance de plus — pour un fichier de déclarations, sans code exécuté. Il
 * tient en une page, autant l'écrire et le relire. Le jour où `lib.dom` les
 * embarque, ce fichier disparaît.
 *
 * Aucun `import` ni `export` ici : c'est ce qui rend les déclarations globales.
 */

type GPUPowerPreference = 'low-power' | 'high-performance';
type GPUTextureFormat = string;
type GPUCanvasAlphaMode = 'opaque' | 'premultiplied';

interface GPUCompilationMessage {
  readonly type: 'error' | 'warning' | 'info';
  readonly message: string;
  readonly lineNum: number;
  readonly linePos: number;
}

interface GPUCompilationInfo {
  readonly messages: ReadonlyArray<GPUCompilationMessage>;
}

interface GPUShaderModule {
  getCompilationInfo(): Promise<GPUCompilationInfo>;
}

interface GPUBuffer {
  destroy(): void;
}

interface GPUBindGroupLayout {
  readonly label: string;
}

interface GPUBindGroup {
  readonly label: string;
}

interface GPURenderPipeline {
  getBindGroupLayout(index: number): GPUBindGroupLayout;
}

interface GPUTextureView {
  readonly label: string;
}

interface GPUTexture {
  createView(): GPUTextureView;
}

interface GPUCommandBuffer {
  readonly label: string;
}

interface GPURenderPassEncoder {
  setPipeline(pipeline: GPURenderPipeline): void;
  setBindGroup(index: number, group: GPUBindGroup): void;
  draw(vertexCount: number, instanceCount?: number): void;
  end(): void;
}

interface GPURenderPassDescriptor {
  colorAttachments: Array<{
    view: GPUTextureView;
    loadOp: 'load' | 'clear';
    storeOp: 'store' | 'discard';
    clearValue?: { r: number; g: number; b: number; a: number };
  }>;
}

interface GPUCommandEncoder {
  beginRenderPass(descriptor: GPURenderPassDescriptor): GPURenderPassEncoder;
  finish(): GPUCommandBuffer;
}

interface GPUQueue {
  submit(buffers: GPUCommandBuffer[]): void;
  writeBuffer(buffer: GPUBuffer, offset: number, data: BufferSource): void;
  /** Se résout quand le GPU a fini : sert à mesurer le coût d'une image. */
  onSubmittedWorkDone(): Promise<undefined>;
}

interface GPUDeviceLostInfo {
  readonly reason: string;
  readonly message: string;
}

interface GPUError {
  readonly message: string;
}

interface GPUUncapturedErrorEvent extends Event {
  readonly error: GPUError;
}

interface GPURenderPipelineDescriptor {
  label?: string;
  layout: 'auto';
  vertex: { module: GPUShaderModule; entryPoint: string };
  fragment: {
    module: GPUShaderModule;
    entryPoint: string;
    targets: Array<{ format: GPUTextureFormat }>;
  };
  primitive?: { topology: 'triangle-list' };
}

interface GPUDevice extends EventTarget {
  readonly queue: GPUQueue;
  readonly lost: Promise<GPUDeviceLostInfo>;
  createShaderModule(descriptor: { code: string; label?: string }): GPUShaderModule;
  createBuffer(descriptor: { size: number; usage: number; label?: string }): GPUBuffer;
  createBindGroup(descriptor: {
    label?: string;
    layout: GPUBindGroupLayout;
    entries: Array<{ binding: number; resource: { buffer: GPUBuffer } }>;
  }): GPUBindGroup;
  createRenderPipelineAsync(
    descriptor: GPURenderPipelineDescriptor
  ): Promise<GPURenderPipeline>;
  createCommandEncoder(): GPUCommandEncoder;
  destroy(): void;
}

interface GPUAdapter {
  requestDevice(): Promise<GPUDevice>;
}

interface GPU {
  requestAdapter(options?: {
    powerPreference?: GPUPowerPreference;
  }): Promise<GPUAdapter | null>;
  getPreferredCanvasFormat(): GPUTextureFormat;
}

interface GPUCanvasContext {
  configure(configuration: {
    device: GPUDevice;
    format: GPUTextureFormat;
    alphaMode?: GPUCanvasAlphaMode;
  }): void;
  unconfigure(): void;
  getCurrentTexture(): GPUTexture;
}

interface Navigator {
  readonly gpu?: GPU;
}

interface HTMLCanvasElement {
  getContext(contextId: 'webgpu'): GPUCanvasContext | null;
}

declare const GPUBufferUsage: {
  readonly UNIFORM: number;
  readonly STORAGE: number;
  readonly COPY_DST: number;
};
