import { WebGLRenderer } from 'three'

// Safari-specific fullscreen API extensions
interface SafariDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
}

interface SafariHTMLElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}

export function resize_renderer_to_display_size(renderer: WebGLRenderer): boolean {
  const canvas = renderer.domElement
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  const needResize = canvas.width !== width || canvas.height !== height
  if (needResize)
    renderer.setSize(width, height, false)

  return needResize
}

export function toggle_full_screen(canvas: HTMLElement): void {
  const doc = document as SafariDocument;
  const element = canvas as SafariHTMLElement;

  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else if (!document.fullscreenElement && canvas.requestFullscreen) {
    canvas.requestFullscreen()
  }
  // Safari support - doesn't support the standard yet
  else if (doc.webkitFullscreenElement) {
    doc.webkitExitFullscreen?.()
  } else if (!doc.webkitFullscreenElement && element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen()
  }
}

export function get_window_size(): { width: number; height: number } {
  return { width: window.innerWidth, height: window.innerHeight }
}
