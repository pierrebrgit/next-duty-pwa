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

func drawLinearGradient(
  in context: CGContext,
  rect: CGRect,
  from startColor: Color,
  to endColor: Color,
  start: CGPoint,
  end: CGPoint
) {
  let gradient = CGGradient(
    colorsSpace: CGColorSpaceCreateDeviceRGB(),
    colors: [startColor.cgColor, endColor.cgColor] as CFArray,
    locations: [0, 1]
  )!

  context.saveGState()
  context.clip(to: rect)
  context.drawLinearGradient(
    gradient,
    start: start,
    end: end,
    options: [.drawsBeforeStartLocation, .drawsAfterEndLocation]
  )
  context.restoreGState()
}

func topRoundedRect(_ rect: CGRect, radius: CGFloat) -> CGPath {
  let path = CGMutablePath()

  path.move(to: CGPoint(x: rect.minX, y: rect.maxY))
  path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + radius))
  path.addQuadCurve(
    to: CGPoint(x: rect.minX + radius, y: rect.minY),
    control: CGPoint(x: rect.minX, y: rect.minY)
  )
  path.addLine(to: CGPoint(x: rect.maxX - radius, y: rect.minY))
  path.addQuadCurve(
    to: CGPoint(x: rect.maxX, y: rect.minY + radius),
    control: CGPoint(x: rect.maxX, y: rect.minY)
  )
  path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
  path.closeSubpath()

  return path
}

func drawPlane(in context: CGContext) {
  context.saveGState()
  context.setFillColor(Color(0x173245).cgColor)

  context.addPath(
    CGPath(
      roundedRect: CGRect(x: 286, y: 730, width: 452, height: 46),
      cornerWidth: 4,
      cornerHeight: 4,
      transform: nil
    )
  )
  context.fillPath()

  let plane = CGMutablePath()
  plane.move(to: CGPoint(x: 258, y: 615))
  plane.addCurve(
    to: CGPoint(x: 365, y: 557),
    control1: CGPoint(x: 299, y: 598),
    control2: CGPoint(x: 329, y: 579)
  )
  plane.addLine(to: CGPoint(x: 292, y: 494))
  plane.addCurve(
    to: CGPoint(x: 304, y: 474),
    control1: CGPoint(x: 282, y: 485),
    control2: CGPoint(x: 288, y: 476)
  )
  plane.addLine(to: CGPoint(x: 344, y: 469))
  plane.addCurve(
    to: CGPoint(x: 382, y: 489),
    control1: CGPoint(x: 357, y: 468),
    control2: CGPoint(x: 370, y: 477)
  )
  plane.addLine(to: CGPoint(x: 438, y: 535))
  plane.addCurve(
    to: CGPoint(x: 513, y: 535),
    control1: CGPoint(x: 461, y: 554),
    control2: CGPoint(x: 489, y: 553)
  )
  plane.addLine(to: CGPoint(x: 652, y: 445))
  plane.addCurve(
    to: CGPoint(x: 766, y: 402),
    control1: CGPoint(x: 691, y: 420),
    control2: CGPoint(x: 731, y: 400)
  )
  plane.addCurve(
    to: CGPoint(x: 789, y: 430),
    control1: CGPoint(x: 793, y: 404),
    control2: CGPoint(x: 802, y: 416)
  )
  plane.addCurve(
    to: CGPoint(x: 700, y: 489),
    control1: CGPoint(x: 774, y: 449),
    control2: CGPoint(x: 744, y: 469)
  )
  plane.addLine(to: CGPoint(x: 638, y: 518))
  plane.addLine(to: CGPoint(x: 657, y: 552))
  plane.addLine(to: CGPoint(x: 623, y: 568))
  plane.addLine(to: CGPoint(x: 588, y: 540))
  plane.addLine(to: CGPoint(x: 430, y: 609))
  plane.addLine(to: CGPoint(x: 318, y: 670))
  plane.addLine(to: CGPoint(x: 338, y: 618))
  plane.addLine(to: CGPoint(x: 277, y: 637))
  plane.addCurve(
    to: CGPoint(x: 258, y: 615),
    control1: CGPoint(x: 261, y: 642),
    control2: CGPoint(x: 251, y: 628)
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
  context.interpolationQuality = .high

  let iconRect = CGRect(x: 0, y: 0, width: 1024, height: 1024)
  drawLinearGradient(
    in: context,
    rect: iconRect,
    from: Color(0x08305f),
    to: Color(0x0f7fcf),
    start: CGPoint(x: 120, y: 80),
    end: CGPoint(x: 920, y: 940)
  )

  let calendarRect = CGRect(x: 180, y: 174, width: 664, height: 672)
  context.setFillColor(Color(0xf7f9fc).cgColor)
  context.addPath(
    CGPath(
      roundedRect: calendarRect,
      cornerWidth: 72,
      cornerHeight: 72,
      transform: nil
    )
  )
  context.fillPath()

  context.setStrokeColor(Color(0xc6d1dc).cgColor)
  context.setLineWidth(12)
  context.addPath(
    CGPath(
      roundedRect: calendarRect.insetBy(dx: 6, dy: 6),
      cornerWidth: 66,
      cornerHeight: 66,
      transform: nil
    )
  )
  context.strokePath()

  let headerRect = CGRect(x: 180, y: 174, width: 664, height: 178)
  context.addPath(topRoundedRect(headerRect, radius: 72))
  context.saveGState()
  context.clip()
  drawLinearGradient(
    in: context,
    rect: headerRect,
    from: Color(0x2bb3f3),
    to: Color(0x0288dc),
    start: CGPoint(x: 180, y: 174),
    end: CGPoint(x: 844, y: 352)
  )
  context.restoreGState()

  context.setFillColor(Color(0xd8e4ee).cgColor)
  context.fill(CGRect(x: 180, y: 346, width: 664, height: 8))

  let rings = [
    (x: CGFloat(348), y: CGFloat(112)),
    (x: CGFloat(676), y: CGFloat(112)),
  ]

  for ring in rings {
    context.setFillColor(Color(0xe8eef5).cgColor)
    context.fillEllipse(in: CGRect(x: ring.x - 42, y: 228, width: 84, height: 84))

    context.setFillColor(Color(0x6b7280).cgColor)
    context.addPath(
      CGPath(
        roundedRect: CGRect(x: ring.x - 22, y: ring.y, width: 44, height: 150),
        cornerWidth: 22,
        cornerHeight: 22,
        transform: nil
      )
    )
    context.fillPath()
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
