class FaviconManager {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private originalFavicon: string = '/favicon.svg';

  constructor() {
    // Initialize only on client side
    if (typeof window !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 32;
      this.canvas.height = 32;
      this.ctx = this.canvas.getContext('2d');
    }
  }

  updateBadge(count: number) {
    if (typeof window === 'undefined' || !this.canvas || !this.ctx) return;
    
    if (count === 0) {
      this.clearBadge();
      return;
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, 32, 32);

    // Draw base circle (simplified favicon)
    this.ctx.fillStyle = '#6366f1'; // indigo-500
    this.ctx.beginPath();
    this.ctx.arc(16, 16, 14, 0, 2 * Math.PI);
    this.ctx.fill();

    // Draw chat icon (simplified)
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(8, 10, 16, 8);
    this.ctx.fillRect(10, 18, 4, 4);

    // Draw badge if count > 0
    if (count > 0) {
      const text = count > 99 ? '99+' : count.toString();
      
      // Badge background
      this.ctx.fillStyle = '#ef4444'; // red-500
      this.ctx.beginPath();
      this.ctx.arc(24, 8, 8, 0, 2 * Math.PI);
      this.ctx.fill();

      // Badge text
      this.ctx.fillStyle = 'white';
      this.ctx.font = 'bold 10px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(text, 24, 8);
    }

    // Update favicon
    const dataURL = this.canvas.toDataURL('image/png');
    this.setFavicon(dataURL);
  }

  clearBadge() {
    if (typeof window === 'undefined') return;
    this.setFavicon(this.originalFavicon);
  }

  private setFavicon(href: string) {
    if (typeof window === 'undefined') return;
    
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    
    link.href = href;
  }
}

export const faviconManager = typeof window !== 'undefined' ? new FaviconManager() : null as any;