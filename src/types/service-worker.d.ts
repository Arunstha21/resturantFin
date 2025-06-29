// Service Worker type definitions
interface ServiceWorkerGlobalScope extends WorkerGlobalScope {
  skipWaiting(): Promise<void>
  clients: Clients
  registration: ServiceWorkerRegistration
  addEventListener(type: "install", listener: (event: ExtendableEvent) => void): void
  addEventListener(type: "activate", listener: (event: ExtendableEvent) => void): void
  addEventListener(type: "fetch", listener: (event: FetchEvent) => void): void
  addEventListener(type: "sync", listener: (event: SyncEvent) => void): void
  addEventListener(type: "message", listener: (event: ExtendableMessageEvent) => void): void
}

interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<any>): void
}

interface SyncEvent extends ExtendableEvent {
  tag: string
}

interface ExtendableMessageEvent extends ExtendableEvent {
  data: any
  origin: string
  lastEventId: string
  source: Client | ServiceWorker | MessagePort | null
  ports: ReadonlyArray<MessagePort>
}

interface FetchEvent extends ExtendableEvent {
  request: Request
  clientId: string
  resultingClientId: string
  replacesClientId: string
  respondWith(response: Promise<Response> | Response): void
}

interface Clients {
  claim(): Promise<void>
  get(id: string): Promise<Client | undefined>
  matchAll(options?: ClientQueryOptions): Promise<ReadonlyArray<Client>>
  openWindow(url: string): Promise<WindowClient | null>
}

interface Client {
  frameType: FrameType
  id: string
  type: ClientType
  url: string
  postMessage(message: any, transfer?: Transferable[]): void
}

interface WindowClient extends Client {
  focused: boolean
  visibilityState: VisibilityState
  focus(): Promise<WindowClient>
  navigate(url: string): Promise<WindowClient>
}

interface ClientQueryOptions {
  includeUncontrolled?: boolean
  type?: ClientType
}

type ClientType = "window" | "worker" | "sharedworker" | "all"
type FrameType = "auxiliary" | "top-level" | "nested" | "none"
type VisibilityState = "hidden" | "visible" | "prerender"

declare var self: ServiceWorkerGlobalScope
