import AppKit
import CoreGraphics
import Foundation

struct Color {
  let red: CGFloat
  let green: CGFloat
  let blue: CGFloat
  let alpha: CGFloat

  init(_ hex: UInt32, alpha: CGFloat = 1) {
    red = CGFloat((hex >> 16) & 0xff) / 255
    green = CGFloat((hex >> 8) & 0xff) / 255
    blue = CGFloat(hex & 0xff) / 255
    self.alpha = alpha
  }

  var cgColor: CGColor {
    CGColor(red: red, green: green, blue: blue, alpha: alpha)
  }
}

func topRoundedRect(_ rect: CGRect, radius: CGFloat) -> CGPath {
  let path = CGMutablePath()
  let minX = rect.minX
  let minY = rect.minY
  let maxX = rect.maxX
  let maxY = rect.maxY

  path.move(to: CGPoint(x: minX, y: maxY))
  path.addLine(to: CGPoint(x: minX, y: minY + radius))
  path.addQuadCurve(
    to: CGPoint(x: minX + radius, y: minY),
    control: CGPoint(x: minX, y: minY)
  )
  path.addLine(to: CGPoint(x: maxX - radius, y: minY))
  path.addQuadCurve(
    to: CGPoint(x: maxX, y: minY + radius),
    control: CGPoint(x: maxX, y: minY)
  )
  path.addLine(to: CGPoint(x: maxX, y: maxY))
  path.closeSubpath()
  return path
}

func drawLinearGradient(
  in context: CGContext,
  rect: CGRect,
  from startColor: Color,
  to endColor: Color,
  start: CGPoint,
  end: CGPoint
) {
  let colors = [startColor.cgColor, endColor.cgColor] as CFArray
  let gradient = CGGradient(
    colorsSpace: CGColorSpaceCreateDeviceRGB(),
    colors: colors,
    locations: [0, 1]
  )

  context.saveGState()
  context.clip(to: rect)
  context.drawLinearGradient(
    gradient!,
    start: start,
    end: end,
    options: [.drawsBeforeStartLocation, .drawsAfterEndLocation]
  )
  context.restoreGState()
}

func drawPlane(in context: CGContext) {
  context.saveGState()
  context.setShadow(
    offset: CGSize(width: 0, height: 10),
    blur: 14,
    color: Color(0x18202a, alpha: 0.22).cgColor
  )

  context.setFillColor(Color(0x5d656d).cgColor)
  let engineRadius: CGFloat = 8
  context.addPath(
    CGPath(
      roundedRect: CGRect(x: 413, y: 488, width: 36, height: 88),
      cornerWidth: engineRadius,
      cornerHeight: engineRadius,
      transform: nil
    )
  )
  context.fillPath()
  context.addPath(
    CGPath(
      roundedRect: CGRect(x: 575, y: 488, width: 36, height: 88),
      cornerWidth: engineRadius,
      cornerHeight: engineRadius,
      transform: nil
    )
  )
  context.fillPath()

  let plane = CGMutablePath()
  plane.move(to: CGPoint(x: 512, y: 374))
  plane.addCurve(
    to: CGPoint(x: 552, y: 500),
    control1: CGPoint(x: 539, y: 396),
    control2: CGPoint(x: 552, y: 442)
  )
  plane.addLine(to: CGPoint(x: 553, y: 590))
  plane.addLine(to: CGPoint(x: 773, y: 686))
  plane.addLine(to: CGPoint(x: 766, y: 740))
  plane.addLine(to: CGPoint(x: 552, y: 672))
  plane.addLine(to: CGPoint(x: 549, y: 799))
  plane.addLine(to: CGPoint(x: 637, y: 857))
  plane.addLine(to: CGPoint(x: 629, y: 908))
  plane.addLine(to: CGPoint(x: 523, y: 869))
  plane.addLine(to: CGPoint(x: 512, y: 908))
  plane.addLine(to: CGPoint(x: 501, y: 869))
  plane.addLine(to: CGPoint(x: 395, y: 908))
  plane.addLine(to: CGPoint(x: 387, y: 857))
  plane.addLine(to: CGPoint(x: 475, y: 799))
  plane.addLine(to: CGPoint(x: 472, y: 672))
  plane.addLine(to: CGPoint(x: 258, y: 740))
  plane.addLine(to: CGPoint(x: 251, y: 686))
  plane.addLine(to: CGPoint(x: 471, y: 590))
  plane.addLine(to: CGPoint(x: 472, y: 500))
  plane.addCurve(
    to: CGPoint(x: 512, y: 374),
    control1: CGPoint(x: 472, y: 442),
    control2: CGPoint(x: 485, y: 396)
  )
  plane.closeSubpath()
  context.addPath(plane)
  context.fillPath()
  context.restoreGState()
}

func drawIcon(size: Int, outputPath: String) throws {
  let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: size,
    pixelsHigh: size,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
  )!

  let graphics = NSGraphicsContext(bitmapImageRep: rep)!
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = graphics

  let context = graphics.cgContext
  let scale = CGFloat(size) / 1024
  context.scaleBy(x: scale, y: scale)
  context.translateBy(x: 0, y: 1024)
  context.scaleBy(x: 1, y: -1)

  let iconRect = CGRect(x: 0, y: 0, width: 1024, height: 1024)
  context.setFillColor(Color(0x071329).cgColor)
  context.fill(iconRect)
  drawLinearGradient(
    in: context,
    rect: iconRect,
    from: Color(0x071329),
    to: Color(0x0f4c8f),
    start: CGPoint(x: 90, y: 40),
    end: CGPoint(x: 940, y: 960)
  )

  let glowColors = [Color(0x2aa8ff, alpha: 0.24).cgColor, Color(0x2aa8ff, alpha: 0).cgColor] as CFArray
  let glow = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: glowColors, locations: [0, 1])!
  context.drawRadialGradient(
    glow,
    startCenter: CGPoint(x: 730, y: 230),
    startRadius: 0,
    endCenter: CGPoint(x: 730, y: 230),
    endRadius: 520,
    options: []
  )

  let cardRect = CGRect(x: 156, y: 148, width: 712, height: 728)
  context.saveGState()
  context.setShadow(
    offset: CGSize(width: 0, height: 30),
    blur: 45,
    color: Color(0x000000, alpha: 0.34).cgColor
  )
  context.setFillColor(Color(0xf7faff).cgColor)
  context.addPath(
    CGPath(
      roundedRect: cardRect,
      cornerWidth: 88,
      cornerHeight: 88,
      transform: nil
    )
  )
  context.fillPath()
  context.restoreGState()

  context.setStrokeColor(Color(0xb7c7d9, alpha: 0.9).cgColor)
  context.setLineWidth(10)
  context.addPath(
    CGPath(
      roundedRect: cardRect,
      cornerWidth: 88,
      cornerHeight: 88,
      transform: nil
    )
  )
  context.strokePath()

  let headerRect = CGRect(x: 156, y: 148, width: 712, height: 210)
  context.addPath(topRoundedRect(headerRect, radius: 88))
  context.saveGState()
  context.clip()
  drawLinearGradient(
    in: context,
    rect: headerRect,
    from: Color(0x2aa8ff),
    to: Color(0x0876d4),
    start: CGPoint(x: 156, y: 148),
    end: CGPoint(x: 868, y: 358)
  )
  context.restoreGState()

  context.setFillColor(Color(0xd9e8f8).cgColor)
  context.fill(CGRect(x: 156, y: 352, width: 712, height: 8))

  let ringCenters = [CGPoint(x: 338, y: 196), CGPoint(x: 686, y: 196)]
  for center in ringCenters {
    context.saveGState()
    context.setShadow(
      offset: CGSize(width: 0, height: 8),
      blur: 12,
      color: Color(0x122238, alpha: 0.28).cgColor
    )
    context.setFillColor(Color(0xebf2fb).cgColor)
    context.fillEllipse(in: CGRect(x: center.x - 43, y: center.y - 43, width: 86, height: 86))
    context.restoreGState()

    context.setFillColor(Color(0x6c747c).cgColor)
    context.addPath(
      CGPath(
        roundedRect: CGRect(x: center.x - 24, y: 76, width: 48, height: 140),
        cornerWidth: 24,
        cornerHeight: 24,
        transform: nil
      )
    )
    context.fillPath()

    drawLinearGradient(
      in: context,
      rect: CGRect(x: center.x - 24, y: 76, width: 48, height: 140),
      from: Color(0x90979f),
      to: Color(0x5d656d),
      start: CGPoint(x: center.x, y: 76),
      end: CGPoint(x: center.x, y: 216)
    )
  }

  drawPlane(in: context)

  NSGraphicsContext.restoreGraphicsState()

  let data = rep.representation(using: .png, properties: [:])!
  try data.write(to: URL(fileURLWithPath: outputPath))
}

let outputs = [
  (2048, "public/app_icon_orig.png"),
  (512, "public/logo512.png"),
  (192, "public/logo192.png"),
  (64, "public/favicon.png"),
]

for output in outputs {
  try drawIcon(size: output.0, outputPath: output.1)
}
