let video; 

let handpose; 

let predictions = []; 

let strings = []; 

let stringCount = 32; 

let pointCount = 46; 

let finger = null; 

let prevFinger = null; 

let sparks = []; 

let floatingNotes = []; 

let audioStarted = false; 

let reverb; 

// 五声音阶 + 高低八度，比较清亮梦幻

let scaleNotes = [ 

  261.63, // C4

  293.66, // D4

  329.63, // E4

  392.0,  // G4

  440.0,  // A4

  523.25, // C5

  587.33, // D5

  659.25, // E5

  783.99, // G5

  880.0,  // A5

  1046.5, // C6

  1174.66 // D6

]; 

// 你指定的清新配色
let customColors = [
  "#4a6e3a",
  "#6c8c48",
  "#97b373",
  "#c0d69e",
  "#87ceeb"
];

let startBtn; 

function setup() { 

  createCanvas(windowWidth, windowHeight); 

  pixelDensity(1); 

  video = createCapture({ video: { width: 640, height: 480, facingMode: "user" } }, () => { 

    console.log("camera ready"); 

  }); 

  video.size(width, height); 

  video.hide(); 

  handpose = ml5.handpose(video, { flipHorizontal: false }, () => { 

    console.log("Handpose model loaded"); 

  }); 

  handpose.on("predict", results => { predictions = results; }); 

  reverb = new p5.Reverb(); 

  createStrings(); 

  textFont("Arial"); 

  // 在 setup() 最后创建开始按钮

  startBtn = createButton("开始（启用声音与摄像头）"); 

  startBtn.style("font-size", "18px"); 

  startBtn.style("z-index", "9999"); 

  startBtn.position((windowWidth - 260) / 2, (windowHeight - 40) / 2); 

  startBtn.size(260, 40); 

  startBtn.mousePressed(() => { 

    startAudioSystem(); 

    startBtn.hide(); 

  }); 

} 

function windowResized() { 

  resizeCanvas(windowWidth, windowHeight); 

  video.size(width, height); 

  createStrings(); 

} 

function createStrings() { 

  strings = []; 

  let marginX = width * 0.045; 

  let topY = height * 0.02; 

  let bottomY = height * 0.86; 

  for (let i = 0; i < stringCount; i++) { 

    let baseX = map(i, 0, stringCount - 1, marginX, width - marginX); 

    // 循环使用自定义配色
    let colorIndex = i % customColors.length;
    let mainColor = color(customColors[colorIndex]);
    let glowColor = lerpColor(mainColor, color(255), 0.3);

    let osc = new p5.Oscillator("sine"); 

    osc.freq(scaleNotes[i % scaleNotes.length]); 

    osc.amp(0); 

    osc.start(); 

    let env = new p5.Envelope(); 

    env.setADSR(0.005, 0.12, 0.12, 0.5); 

    env.setRange(0.28, 0); 

    reverb.process(osc, 2.5, 1.8); 

    let s = { 

      index: i, 

      baseX: baseX, 

      topY: topY, 

      bottomY: bottomY, 

      color: mainColor, 

      glowColor: glowColor, 

      points: [], 

      osc: osc, 

      env: env, 

      lastPlayTime: 0, 

      energy: 0

    }; 

    for (let j = 0; j < pointCount; j++) { 

      let y = map(j, 0, pointCount - 1, topY, bottomY); 

      s.points.push({ 

        x: baseX, 

        y: y, 

        vx: 0

      }); 

    } 

    strings.push(s); 

  } 

} 

function draw() { 

  background(0); 

  drawCameraBackground(); 

  updateFinger(); 

  updateStrings(); 

  drawStrings(); 

  updateSparks(); 

  updateFloatingNotes(); 

  drawFingerIndicator(); 

  drawTitleAndTips(); 

} 

function drawCameraBackground() { 

  push(); 

  // 在画布上做镜像绘制（因为我们在 handpose 使用 flipHorizontal: false）

  translate(width, 0); 

  scale(-1, 1); 

  image(video, 0, 0, width, height); 

  pop(); 

  // 蓝色滤镜，接近天空和糖果色效果

  noStroke(); 

  fill(40, 130, 255, 38); 

  rect(0, 0, width, height); 

  // 轻微暗角，让彩线更突出

  let ctx = drawingContext; 

  let gradient = ctx.createRadialGradient( 

    width / 2, 

    height / 2, 

    width * 0.1, 

    width / 2, 

    height / 2, 

    width * 0.8

  ); 

  gradient.addColorStop(0, "rgba(255,255,255,0)"); 

  gradient.addColorStop(1, "rgba(0,0,0,0.45)"); 

  ctx.save(); 

  ctx.fillStyle = gradient; 

  ctx.fillRect(0, 0, width, height); 

  ctx.restore(); 

} 

function updateFinger() { 

  prevFinger = finger; 

  finger = null; 

  if (predictions.length > 0) { 

    let hand = predictions[0]; 

    if (hand.landmarks && hand.landmarks.length > 8) { 

      // 8 是食指指尖

      let tip = hand.landmarks[8]; 

      // ------------- 修改点开始 (使用摄像头实际帧尺寸做映射) -------------

      // 优先使用 video.elt.videoWidth/videoHeight（摄像头的实际帧尺寸）
      let vidW = (video && video.elt && video.elt.videoWidth) ? video.elt.videoWidth : video.width;
      let vidH = (video && video.elt && video.elt.videoHeight) ? video.elt.videoHeight : video.height;

      // 映射到 canvas 大小
      let mappedX = tip[0] * (width / vidW);
      let mappedY = tip[1] * (height / vidH);

      // 因为画布上对 video 做了镜像绘制，这里把 x 翻转回画布坐标
      finger = {
        x: width - mappedX,
        y: mappedY
      };
      // ------------- 修改点结束 -------------

    } 

  } 

  // 没识别到手的时候，可以用鼠标测试

  if (!finger && mouseIsPressed) { 

    finger = { 

      x: mouseX, 

      y: mouseY

    }; 

  } 

} 

function updateStrings() { 

  let radius = min(width, height) * 0.075; 

  let fingerVX = 0; 

  let fingerVY = 0; 

  if (finger && prevFinger) { 

    fingerVX = finger.x - prevFinger.x; 

    fingerVY = finger.y - prevFinger.y; 

  } 

  for (let s of strings) { 

    s.energy *= 0.94; 

    for (let j = 0; j < s.points.length; j++) { 

      let p = s.points[j]; 

      // 端点稍微固定，中间更软

      let t = j / (s.points.length - 1); 

      let fixedAmount = endpointFix(t); 

      let spring = 0.045 * fixedAmount; 

      let damping = 0.91; 

      // 回到原始 x 的弹簧力

      let force = (s.baseX - p.x) * spring; 

      p.vx += force; 

      // 邻近点平滑耦合，让线像毛线，不是单点断裂

      if (j > 0 && j < s.points.length - 1) { 

        let left = s.points[j - 1]; 

        let right = s.points[j + 1]; 

        let neighborAverage = (left.x + right.x) * 0.5; 

        p.vx += (neighborAverage - p.x) * 0.035; 

      } 

      // 手指交互

      if (finger) { 

        let dx = p.x - finger.x; 

        let dy = p.y - finger.y; 

        let d = sqrt(dx * dx + dy * dy); 

        if (d < radius) { 

          let strength = pow(1 - d / radius, 2.2); 

          // 横向拨动：手指速度越大，线被拨得越明显

          let pluckForce = fingerVX * strength * 0.58; 

          // 如果手指慢慢靠近，也给一个推开的力

          let push = 0; 

          if (abs(dx) < radius) { 

            push = (dx > 0 ? 1 : -1) * strength * 2.5; 

          } 

          p.vx += pluckForce + push; 

          s.energy += strength * 0.08; 

          if ( 

            strength > 0.55 && 

            abs(fingerVX) > 1.8 && 

            millis() - s.lastPlayTime > 130

          ) { 

            playStringSound(s, strength, fingerVX); 

            createSpark(finger.x, finger.y, s.color); 

            createFloatingNote(finger.x, finger.y, s.index); 

            s.lastPlayTime = millis(); 

          } 

        } 

      } 

      p.vx *= damping; 

      p.x += p.vx; 

    } 

  } 

} 

function endpointFix(t) { 

  // 顶部和底部更紧，中间更自由

  let centerFreedom = sin(t * PI); 

  return map(centerFreedom, 0, 1, 1.8, 0.55); 

} 

function drawStrings() { 

  colorMode(RGB); 

  for (let s of strings) { 

    let energyWidth = map(constrain(s.energy, 0, 1), 0, 1, 2.2, 6.5); 

    // 外层辉光

    noFill(); 

    stroke(red(s.glowColor), green(s.glowColor), blue(s.glowColor), 70); 

    strokeWeight(energyWidth + 5); 

    drawOneStringCurve(s); 

    // 毛线阴影线

    stroke(0, 90); 

    strokeWeight(energyWidth + 2); 

    drawOneStringCurve(s, 2); 

    // 主彩色线

    stroke(s.color); 

    strokeWeight(energyWidth); 

    drawOneStringCurve(s); 

    // 毛线纹理：用很短的小斜线模拟纤维

    drawYarnFibers(s); 

    // 底部小圆环

    let bottom = s.points[s.points.length - 1]; 

    drawBottomBead(bottom.x, bottom.y, s); 

  } 

} 

function drawOneStringCurve(s, offsetX = 0) { 

  beginShape(); 

  for (let i = 0; i < s.points.length; i++) { 

    let p = s.points[i]; 

    let wobble = sin(frameCount * 0.04 + i * 0.6 + s.index) * 0.35; 

    curveVertex(p.x + offsetX + wobble, p.y); 

  } 

  endShape(); 

} 

function drawYarnFibers(s) { 

  let step = 4; 

  for (let i = 2; i < s.points.length - 2; i += step) { 

    let p = s.points[i]; 

    let alpha = 100; 

    stroke(255, alpha); 

    strokeWeight(0.7); 

    let angle = sin(i * 0.8 + frameCount * 0.03 + s.index) * 0.8; 

    let len = 4; 

    line( 

      p.x - cos(angle) * len, 

      p.y - sin(angle) * len, 

      p.x + cos(angle) * len, 

      p.y + sin(angle) * len

    ); 

  } 

} 

function drawBottomBead(x, y, s) { 

  push(); 

  noStroke(); 

  fill(red(s.glowColor), green(s.glowColor), blue(s.glowColor), 80); 

  circle(x, y, 18 + s.energy * 20); 

  stroke(255); 

  strokeWeight(2); 

  fill(s.color); 

  circle(x, y, 9 + s.energy * 7); 

  fill(255, 230); 

  noStroke(); 

  circle(x - 2, y - 2, 3); 

  pop(); 

} 

function playStringSound(s, strength, fingerVX) { 

  if (!audioStarted) return; 

  let baseFreq = scaleNotes[s.index % scaleNotes.length]; 

  // 手指速度会稍微影响音高，增加“弹拨”感觉

  let bend = map(constrain(fingerVX, -20, 20), -20, 20, -25, 25); 

  let freq = baseFreq + bend; 

  s.osc.freq(freq, 0.03); 

  let amp = map(constrain(strength, 0, 1), 0, 1, 0.08, 0.34); 

  s.env.setRange(amp, 0); 

  s.env.play(s.osc); 

} 

function createSpark(x, y, c) { 

  for (let i = 0; i < 18; i++) { 

    let a = random(TWO_PI); 

    let spd = random(1.5, 7); 

    sparks.push({ 

      x: x, 

      y: y, 

      vx: cos(a) * spd, 

      vy: sin(a) * spd, 

      life: 1, 

      color: c, 

      size: random(3, 8) 

    }); 

  } 

} 

function updateSparks() { 

  for (let i = sparks.length - 1; i >= 0; i--) { 

    let p = sparks[i]; 

    p.x += p.vx; 

    p.y += p.vy; 

    p.vx *= 0.94; 

    p.vy *= 0.94; 

    p.vy += 0.03; 

    p.life -= 0.035; 

    if (p.life <= 0) { 

      sparks.splice(i, 1); 

    } 

  } 

  noStroke(); 

  for (let p of sparks) { 

    fill(red(p.color), green(p.color), blue(p.color), p.life * 220); 

    circle(p.x, p.y, p.size * p.life); 

    fill(255, p.life * 190); 

    circle(p.x, p.y, p.size * 0.35 * p.life); 

  } 

} 

function createFloatingNote(x, y, index) { 

  let symbols = ["♪", "♫", "♩", "♬"]; 

  floatingNotes.push({ 

    x: x, 

    y: y, 

    vy: random(-1.8, -0.8), 

    vx: random(-0.6, 0.6), 

    life: 1, 

    text: symbols[index % symbols.length], 

    size: random(22, 36) 

  }); 

} 

function updateFloatingNotes() { 

  for (let i = floatingNotes.length - 1; i >= 0; i--) { 

    let n = floatingNotes[i]; 

    n.x += n.vx; 

    n.y += n.vy; 

    n.life -= 0.015; 

    if (n.life <= 0) { 

      floatingNotes.splice(i, 1); 

    } 

  } 

  textAlign(CENTER, CENTER); 

  textStyle(BOLD); 

  for (let n of floatingNotes) { 

    fill(255, 240, 80, n.life * 255); 

    stroke(0, n.life * 180); 

    strokeWeight(4); 

    textSize(n.size); 

    text(n.text, n.x, n.y); 

  } 

  noStroke(); 

} 

function drawFingerIndicator() { 

  if (!finger) return; 

  push(); 

  noStroke(); 

  fill(0, 255, 120, 70); 

  circle(finger.x, finger.y, 42 + sin(frameCount * 0.2) * 5); 

  fill(0, 255, 120); 

  circle(finger.x, finger.y, 18); 

  fill(255); 

  circle(finger.x - 4, finger.y - 4, 5); 

  pop(); 

} 

function drawTitleAndTips() { 

  push(); 

  textAlign(CENTER, CENTER); 

  textStyle(BOLD); 

  // 标题

  let titleY = height * 0.07; 

  textSize(constrain(width * 0.045, 26, 58)); 

  stroke(0); 

  strokeWeight(8); 

  fill(255); 

  text("", width / 2, titleY); 

  noStroke(); 

  fill(255); 

  text("", width / 2, titleY); 

  // 底部说明

  textAlign(LEFT, BOTTOM); 

  textSize(16); 

  textStyle(NORMAL); 

  let msg = audioStarted

    ? "用食指轻轻划过彩色毛线，拨动会发出音符" 

    : "点击画面开启声音，然后用食指拨动毛线"; 

  fill(0, 170); 

  rect(18, height - 52, textWidth(msg) + 30, 34, 12); 

  fill(255); 

  noStroke(); 

  text(msg, 32, height - 28); 

  pop(); 

} 

function mousePressed() { 

  startAudioSystem(); 

} 

function touchStarted() { 

  startAudioSystem(); 

  return false; 

} 

function startAudioSystem() { 

  if (!audioStarted) { 

    userStartAudio(); 

    audioStarted = true; 

  } 

} 

function hslColor(h, s, l) { 

  colorMode(HSL, 360, 100, 100, 1); 

  let c = color(h, s, l); 

  colorMode(RGB, 255, 255, 255, 255); 

  return c; 

}