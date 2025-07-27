import domtoimage from 'dom-to-image-more'

const container = document.getElementById('hex')
const containerSize = container.getBoundingClientRect().width
const cx = containerSize / 2
const cy = containerSize / 2
const radius = containerSize * 0.4

const points = [
  { id: 'nw', angle: 210 },
  { id: 'n', angle: 270 },
  { id: 'ne', angle: 330 },
  { id: 'se', angle: 30 },
  { id: 's', angle: 90 },
  { id: 'sw', angle: 150 },
  { id: 'center', x: cx, y: cy }
]

const shapes = ['triangle', 'circle', 'diamond', 'none']
const connections = [
  ['nw', 'n'],
  ['n', 'ne'],
  ['ne', 'se'],
  ['se', 's'],
  ['s', 'sw'],
  ['sw', 'nw'],
  ['center', 'nw'],
  ['center', 'n'],
  ['center', 'ne'],
  ['center', 'se'],
  ['center', 's'],
  ['center', 'sw']
]

const shapeState = {}
const lineState = {}
const pointEls = {}
const lineEls = {}

function polarToCartesian (angleDeg) {
  const angleRad = (angleDeg * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad)
  }
}

function createShape (point) {
  let x = point.x,
    y = point.y
  if (typeof point.angle === 'number') {
    const pos = polarToCartesian(point.angle)
    x = pos.x
    y = pos.y
  }

  const el = document.createElement('div')
  el.className = 'point'
  el.style.left = `${x}px`
  el.style.top = `${y}px`

  let shapeIndex = 0
  shapeState[point.id] = shapes[shapeIndex]

  const svg = document.createElement('img')
  svg.src = import.meta.env.BASE_URL + `${shapes[shapeIndex]}.svg`
  svg.classList.toggle('triangle-adjust', shapes[shapeIndex] === 'triangle')
  svg.style.display = shapes[shapeIndex] === 'none' ? 'none' : 'block'

  const label = document.createElement('input')
  label.className = 'point-label'
  label.type = 'text'
  label.maxLength = 1
  label.value = '1'
  label.style.display = 'block'

  el.appendChild(svg)
  el.appendChild(label)
  container.appendChild(el)

  el.addEventListener('click', e => {
    if (e.target === label) return
    shapeIndex = (shapeIndex + 1) % shapes.length
    shapeState[point.id] = shapes[shapeIndex]
    const shape = shapes[shapeIndex]
    shapeState[point.id] = shape

    svg.src = import.meta.env.BASE_URL + `${shape}.svg`
    svg.classList.toggle('triangle-adjust', shape === 'triangle')

    const show = shape !== 'none'
    svg.style.display = show ? 'block' : 'none'
    label.style.display = show ? 'block' : 'none'

    updateLines()
  })

  pointEls[point.id] = { el, x, y }
}

points.forEach(createShape)

function createLine (id1, id2) {
  const line = document.createElement('div')
  line.className = 'line'

  function positionLine () {
    const p1 = pointEls[id1]
    const p2 = pointEls[id2]
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const length = Math.sqrt(dx * dx + dy * dy)
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI

    line.style.width = `${length}px`
    line.style.left = `${p1.x}px`
    line.style.top = `${p1.y}px`
    line.style.transform = `rotate(${angle}deg)`
  }

  line.dataset.state = 'solid'
  line.addEventListener('click', () => {
    const order = ['solid', 'dotted', 'tick', 'none']
    const current = line.dataset.state
    const next = order[(order.indexOf(current) + 1) % order.length]
    line.dataset.state = next

    line.className = 'line'

    if (next === 'dotted') {
      line.classList.add('dotted')
      line.style.opacity = '1'
      line.style.pointerEvents = 'auto'
    } else if (next === 'tick') {
      line.classList.add('tick')
      line.style.opacity = '1'
      line.style.pointerEvents = 'auto'
    } else if (next === 'solid') {
      line.style.opacity = '1'
      line.style.pointerEvents = 'auto'
    } else if (next === 'none') {
      line.style.opacity = '0.01'
      line.style.pointerEvents = 'auto'
    }
  })

  positionLine()
  container.appendChild(line)
  return line
}

connections.forEach(([a, b]) => {
  const key = `${a}-${b}`
  lineEls[key] = createLine(a, b)
})

function updateLines () {
  connections.forEach(([a, b]) => {
    const line = lineEls[`${a}-${b}`]
    const visible = shapeState[a] !== 'none' && shapeState[b] !== 'none'
    line.style.display = visible ? 'block' : 'none'
  })
}

document.getElementById('save-btn').addEventListener('click', () => {
  const original = document.getElementById('hex')
  const clone = original.cloneNode(true)

  // Force clone to 800x800 offscreen
  clone.style.width = '800px'
  clone.style.height = '800px'
  clone.style.position = 'fixed'
  clone.style.top = '-9999px'
  clone.style.left = '-9999px'
  clone.style.zIndex = '-1'
  clone.style.transform = 'scale(1)'
  clone.style.transformOrigin = 'top left'
  document.body.appendChild(clone)

  domtoimage
    .toPng(clone, {
      width: 800,
      height: 800,
      style: { transform: 'scale(1)' }
    })
    .then(dataUrl => {
      document.body.removeChild(clone)

      const img = new Image()
      img.onload = () => {
        // Step 1: Draw full image to canvas
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)

        // Step 2: Get pixel data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const { data, width, height } = imageData

        let minX = width,
          minY = height,
          maxX = 0,
          maxY = 0
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4
            const alpha = data[idx + 3]
            if (alpha > 0) {
              if (x < minX) minX = x
              if (y < minY) minY = y
              if (x > maxX) maxX = x
              if (y > maxY) maxY = y
            }
          }
        }

        // Step 3: Crop to bounding box
        const cropWidth = maxX - minX + 1
        const cropHeight = maxY - minY + 1
        const croppedCanvas = document.createElement('canvas')
        croppedCanvas.width = cropWidth
        croppedCanvas.height = cropHeight
        const croppedCtx = croppedCanvas.getContext('2d')
        croppedCtx.drawImage(
          canvas,
          minX,
          minY,
          cropWidth,
          cropHeight,
          0,
          0,
          cropWidth,
          cropHeight
        )

        // Step 4: Download
        const link = document.createElement('a')
        link.download = 'hex-dungeon-cropped.png'
        link.href = croppedCanvas.toDataURL('image/png')
        link.click()
      }

      img.src = dataUrl
    })
    .catch(err => {
      console.error('Snapshot failed:', err)
      document.body.removeChild(clone)
    })
})
