import { InventoryService } from '../../../inventory/application/InventoryService'
import { blockRegistry } from '../../../blocks'

export class RadialMenuManager {
  private container: HTMLDivElement
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private isVisible = false
  private mousePos = { x: 0, y: 0 }
  
  // Config
  private centerX = 0
  private centerY = 0
  private outerRadius = 250
  private innerRadius = 100
  private bankRadius = 180 // Divide inner/outer rings
  
  constructor(private inventory: InventoryService) {
    this.container = document.createElement('div')
    this.container.className = 'radial-menu hidden'
    this.container.style.position = 'absolute'
    this.container.style.top = '0'
    this.container.style.left = '0'
    this.container.style.width = '100%'
    this.container.style.height = '100%'
    this.container.style.pointerEvents = 'none' 
    this.container.style.zIndex = '1000'
    // DEBUG: Border to verify existence
    this.container.style.border = '5px solid red'

    this.canvas = document.createElement('canvas')
    this.container.appendChild(this.canvas)
    document.body.appendChild(this.container)
    
    this.ctx = this.canvas.getContext('2d')!
    this.resize()
    
    window.addEventListener('resize', () => this.resize())
  }

  show(): void {
    console.log('RadialMenu: show() called')
    this.isVisible = true
    this.container.classList.remove('hidden')
    this.draw()
  }

  hide(): void {
    console.log('RadialMenu: hide() called')
    this.isVisible = false
    this.container.classList.add('hidden')
  }

  updateMouse(x: number, y: number): void {
    if (!this.isVisible) return
    this.mousePos = { x, y }
    this.draw()
  }
  
  handleClick(): number | null {
    if (!this.isVisible) return null
    return null 
  }

  private resize(): void {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.centerX = this.canvas.width / 2
    this.centerY = this.canvas.height / 2
    if (this.isVisible) this.draw()
  }

  private iconCache = new Map<number, HTMLImageElement>()

  private getIcon(blockId: number): HTMLImageElement | null {
      if (this.iconCache.has(blockId)) {
          return this.iconCache.get(blockId)!
      }
      
      const block = blockRegistry.get(blockId)
      if (block && block.icon) {
          const img = new Image()
          img.src = block.icon
          img.onload = () => this.draw() // Redraw when loaded
          this.iconCache.set(blockId, img)
          return img
      }
      return null
  }

  private draw(): void {
    if (!this.ctx) return
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    
    const banks = this.inventory.getAllBanks()
    const activeBank = this.inventory.getActiveBank()
    
    // DEBUG: Draw a big circle to ensure canvas is working
    // this.ctx.beginPath() ... (removed debug circle)
    
    const mouseAngle = Math.atan2(this.mousePos.y - this.centerY, this.mousePos.x - this.centerX)
    const mouseDist = Math.sqrt(Math.pow(this.mousePos.x - this.centerX, 2) + Math.pow(this.mousePos.y - this.centerY, 2))
    
    // Normalize angle to 0-2PI
    let normAngle = mouseAngle
    if (normAngle < 0) normAngle += Math.PI * 2
    
    // 1. Draw Inner Ring (Banks)
    const sliceAngle = (Math.PI * 2) / 10
    
    let hoveredBankIndex = -1
    
    if (mouseDist > 50 && mouseDist < this.bankRadius) {
      hoveredBankIndex = Math.floor(normAngle / sliceAngle)
    }

    for (let i = 0; i < 10; i++) {
      const startAngle = i * sliceAngle
      const endAngle = (i + 1) * sliceAngle
      
      this.ctx.beginPath()
      this.ctx.moveTo(this.centerX, this.centerY)
      this.ctx.arc(this.centerX, this.centerY, this.bankRadius, startAngle, endAngle)
      this.ctx.closePath()
      
      if (i === hoveredBankIndex) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
        // Update active bank on hover? 
        // "Radial 'open' to show the bank" - yes, hover opens the outer ring
      } else if (banks[i].id === activeBank.id) {
         this.ctx.fillStyle = 'rgba(0, 200, 100, 0.5)'
      } else {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      }
      
      this.ctx.fill()
      this.ctx.stroke()
      
      // Draw Bank Label
      this.ctx.fillStyle = 'white'
      this.ctx.font = '12px Arial'
      const midAngle = startAngle + sliceAngle / 2
      const textX = this.centerX + Math.cos(midAngle) * (this.bankRadius * 0.6)
      const textY = this.centerY + Math.sin(midAngle) * (this.bankRadius * 0.6)
      this.ctx.fillText(`Bank ${i}`, textX - 20, textY)
    }
    
    // 2. Draw Outer Ring (Items for Hovered Bank)
    const targetBankIndex = hoveredBankIndex !== -1 ? hoveredBankIndex : activeBank.id
    const targetBank = banks[targetBankIndex]
    
    if (targetBank) {
      // Draw 10 items in a ring around the bank ring
      // We only show this ring if we are hovering a bank or if we want to show current bank items
      // "Sunburst would basically have 100 slots broken up into 10 banks"
      
      // Let's draw the items for the FOCUSED bank in the outer ring
      // Position them radially aligned with the bank slice? 
      // No, that would cram 10 items into 36 degrees.
      // The prompt says "second row of the circle". 
      // A true sunburst would show ALL 100 items if expanded.
      // But space is limited.
      
      // Interpretation: 
      // Inner Ring: 10 Banks.
      // Outer Ring: The 10 items OF THE HOVERED BANK, spread across the FULL circle? 
      // OR spread within the slice? (Too small).
      
      // Let's try: When hovering Bank X, the outer ring appears showing Bank X's items distributed 
      // uniformly around the WHOLE circle.
      
      // Or, maybe the outer ring is ALWAYS visible for the active bank?
      
      // Let's implement: Hovering a bank shows its items in the outer ring (360 degrees).
      
      const itemSliceAngle = (Math.PI * 2) / 10
      let hoveredItemIndex = -1
      
      if (mouseDist > this.bankRadius && mouseDist < this.outerRadius) {
         hoveredItemIndex = Math.floor(normAngle / itemSliceAngle)
      }

      for (let j = 0; j < 10; j++) {
        const startAngle = j * itemSliceAngle
        const endAngle = (j + 1) * itemSliceAngle
        
        this.ctx.beginPath()
        this.ctx.arc(this.centerX, this.centerY, this.outerRadius, startAngle, endAngle)
        this.ctx.arc(this.centerX, this.centerY, this.bankRadius, endAngle, startAngle, true)
        this.ctx.closePath()
        
        if (j === hoveredItemIndex) {
          this.ctx.fillStyle = 'rgba(255, 255, 0, 0.6)'
        } else {
           this.ctx.fillStyle = 'rgba(50, 50, 50, 0.8)'
        }
        
        this.ctx.fill()
        this.ctx.stroke() // Border
        
        // Draw Item Icon
        const blockId = targetBank.slots[j]
        if (blockId > 0) {
             const midAngle = startAngle + itemSliceAngle / 2
             const iconX = this.centerX + Math.cos(midAngle) * ((this.bankRadius + this.outerRadius) / 2)
             const iconY = this.centerY + Math.sin(midAngle) * ((this.bankRadius + this.outerRadius) / 2)
             
             const icon = this.getIcon(blockId)
             if (icon && icon.complete) {
                 const size = 48
                 this.ctx.drawImage(icon, iconX - size/2, iconY - size/2, size, size)
             } else {
                 // Fallback text
                 this.ctx.fillStyle = 'white'
                 this.ctx.font = '10px Arial'
                 this.ctx.textAlign = 'center'
                 this.ctx.fillText(`${blockId}`, iconX, iconY)
             }
        }
      }
    }
  }
}
