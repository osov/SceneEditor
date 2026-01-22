// @ts-nocheck
import { WebGLRenderer } from 'three'

export function resize_renderer_to_display_size(renderer: WebGLRenderer) {
  const canvas = renderer.domElement
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  const needResize = canvas.width !== width || canvas.height !== height
  if (needResize) 
    renderer.setSize(width, height, false)
  
  return needResize
}

export function toggle_full_screen(canvas: HTMLElement) {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else if (!document.fullscreenElement && canvas.requestFullscreen) {
    canvas.requestFullscreen()
  }
  // 👇 safari -> doesn't support the standard yet
  else if (document.webkitFullscreenElement) {
    document.webkitExitFullscreen()
  } else if (!document.webkitFullscreenElement && canvas.webkitRequestFullscreen) {
    canvas.webkitRequestFullscreen()
  }
}

export function get_window_size(){
  return { width: window.innerWidth, height: window.innerHeight }
}