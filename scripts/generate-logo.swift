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

func makeSilhouetteImage(sourcePath: String, tint: Color) throws -> CGImage {
  guard let source = NSImage(contentsOfFile: sourcePath),
        let sourceImage = source.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    throw NSError(domain: "LogoGenerator", code: 1)
  }

  let width = sourceImage.width
  let height = sourceImage.height
  let bytesPerPixel = 4
  let bytesPerRow = width * bytesPerPixel
  let colorSpace = CGColorSpaceCreateDeviceRGB()
  var input = [UInt8](repeating: 0, count: height * bytesPerRow)

  guard let inputContext = CGContext(
    data: &input,
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: bytesPerRow,
    space: colorSpace,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
  ) else {
    throw NSError(domain: "LogoGenerator", code: 2)
  }

  inputContext.draw(
    sourceImage,
    in: CGRect(x: 0, y: 0, width: width, height: height)
  )

  var minX = width
  var minY = height
  var maxX = 0
  var maxY = 0
  let threshold = 225

  for y in 0..<height {
    for x in 0..<width {
      let index = y * bytesPerRow + x * bytesPerPixel
      let red = Int(input[index])
      let green = Int(input[index + 1])
      let blue = Int(input[index + 2])
      let alpha = Int(input[index + 3])
      let luminance = (red + green + blue) / 3

      if alpha > 0 && luminance < threshold {
        minX = min(minX, x)
        minY = min(minY, y)
        maxX = max(maxX, x)
        maxY = max(maxY, y)
      }
    }
  }

  if minX > maxX || minY > maxY {
    throw NSError(domain: "LogoGenerator", code: 3)
  }

  let padding = 6
  minX = max(0, minX - padding)
  minY = max(0, minY - padding)
  maxX = min(width - 1, maxX + padding)
  maxY = min(height - 1, maxY + padding)

  let outputWidth = maxX - minX + 1
  let outputHeight = maxY - minY + 1
  var output = [UInt8](
    repeating: 0,
    count: outputHeight * outputWidth * bytesPerPixel
  )

  let tintRed = UInt8(tint.red * 255)
  let tintGreen = UInt8(tint.green * 255)
  let tintBlue = UInt8(tint.blue * 255)

  for y in 0..<outputHeight {
    for x in 0..<outputWidth {
      let sourceIndex = (minY + y) * bytesPerRow + (minX + x) * bytesPerPixel
      let red = Int(input[sourceIndex])
      let green = Int(input[sourceIndex + 1])
      let blue = Int(input[sourceIndex + 2])
      let sourceAlpha = Int(input[sourceIndex + 3])
      let luminance = (red + green + blue) / 3
      let matteAlpha = min(255, max(0, (245 - luminance) * 5))
      let alpha = UInt8(min(sourceAlpha, matteAlpha))
      let outputIndex = y * outputWidth * bytesPerPixel + x * bytesPerPixel

      output[outputIndex] = UInt8(Int(tintRed) * Int(alpha) / 255)
      output[outputIndex + 1] = UInt8(Int(tintGreen) * Int(alpha) / 255)
      output[outputIndex + 2] = UInt8(Int(tintBlue) * Int(alpha) / 255)
      output[outputIndex + 3] = alpha
    }
  }

  let data = Data(output)
  guard let provider = CGDataProvider(data: data as CFData),
        let image = CGImage(
          width: outputWidth,
          height: outputHeight,
          bitsPerComponent: 8,
          bitsPerPixel: 32,
          bytesPerRow: outputWidth * bytesPerPixel,
          space: colorSpace,
          bitmapInfo: CGBitmapInfo(
            rawValue: CGImageAlphaInfo.premultipliedLast.rawValue
          ),
          provider: provider,
          decode: nil,
          shouldInterpolate: true,
          intent: .defaultIntent
        ) else {
    throw NSError(domain: "LogoGenerator", code: 4)
  }

  return image
}

func aspectFit(image: CGImage, in rect: CGRect) -> CGRect {
  let imageRatio = CGFloat(image.width) / CGFloat(image.height)
  let rectRatio = rect.width / rect.height

  if imageRatio > rectRatio {
    let height = rect.width / imageRatio
    return CGRect(
      x: rect.minX,
      y: rect.midY - height / 2,
      width: rect.width,
      height: height
    )
  }

  let width = rect.height * imageRatio
  return CGRect(
    x: rect.midX - width / 2,
    y: rect.minY,
    width: width,
    height: rect.height
  )
}

func drawImage(_ image: CGImage, in rect: CGRect, context: CGContext) {
  context.saveGState()
  context.translateBy(x: rect.minX, y: rect.maxY)
  context.scaleBy(x: 1, y: -1)
  context.draw(
    image,
    in: CGRect(x: 0, y: 0, width: rect.width, height: rect.height)
  )
  context.restoreGState()
}

func drawPlane(in context: CGContext) throws {
  let image = try makeSilhouetteImage(
    sourcePath: "scripts/plane-silhouette-source.png",
    tint: Color(0x173245)
  )
  let drawRect = aspectFit(
    image: image,
    in: CGRect(x: 258, y: 434, width: 508, height: 234)
  )

  drawImage(image, in: drawRect, context: context)
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

  let calendarRect = CGRect(x: 226, y: 214, width: 572, height: 584)
  context.setFillColor(Color(0xf7f9fc).cgColor)
  context.addPath(
    CGPath(
      roundedRect: calendarRect,
      cornerWidth: 62,
      cornerHeight: 62,
      transform: nil
    )
  )
  context.fillPath()

  context.setStrokeColor(Color(0xc6d1dc).cgColor)
  context.setLineWidth(12)
  context.addPath(
    CGPath(
      roundedRect: calendarRect.insetBy(dx: 6, dy: 6),
      cornerWidth: 56,
      cornerHeight: 56,
      transform: nil
    )
  )
  context.strokePath()

  let headerRect = CGRect(x: 226, y: 214, width: 572, height: 146)
  context.addPath(topRoundedRect(headerRect, radius: 62))
  context.saveGState()
  context.clip()
  drawLinearGradient(
    in: context,
    rect: headerRect,
    from: Color(0x2bb3f3),
    to: Color(0x0288dc),
    start: CGPoint(x: 226, y: 214),
    end: CGPoint(x: 798, y: 360)
  )
  context.restoreGState()

  context.setFillColor(Color(0xd8e4ee).cgColor)
  context.fill(CGRect(x: 226, y: 354, width: 572, height: 8))

  let rings = [
    (x: CGFloat(376), y: CGFloat(142)),
    (x: CGFloat(648), y: CGFloat(142)),
  ]

  for ring in rings {
    context.setFillColor(Color(0xe8eef5).cgColor)
    context.fillEllipse(in: CGRect(x: ring.x - 36, y: 234, width: 72, height: 72))

    context.setFillColor(Color(0x6b7280).cgColor)
    context.addPath(
      CGPath(
        roundedRect: CGRect(x: ring.x - 20, y: ring.y, width: 40, height: 134),
        cornerWidth: 20,
        cornerHeight: 20,
        transform: nil
      )
    )
    context.fillPath()
  }

  try drawPlane(in: context)

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
