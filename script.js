const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");

const mode = document.getElementById("mode");

const muInput = document.getElementById("mu");
const muNumber = document.getElementById("muNumber");

const sigmaInput = document.getElementById("sigma");
const sigmaNumber = document.getElementById("sigmaNumber");

const initialValueInput =
  document.getElementById("initialValue");

const initialValueNumber =
  document.getElementById("initialValueNumber");

const simulationTimeInput =
  document.getElementById("simulationTime");

const simulationTimeNumber =
  document.getElementById("simulationTimeNumber");

const pathsInput = document.getElementById("paths");
const pathsNumber = document.getElementById("pathsNumber");

const speedInput = document.getElementById("speed");
const speedNumber = document.getElementById("speedNumber");

const startButton =
  document.getElementById("startButton");

let paths = [];
let animationId = null;


/*
 * Canvas のサイズを調整
 */
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;

  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;

  ctx.setTransform(
    ratio,
    0,
    0,
    ratio,
    0,
    0
  );
}

window.addEventListener("resize", () => {
  resizeCanvas();

  if (paths.length > 0) {
    draw(paths[0].length - 1);
  }
});

resizeCanvas();


/*
 * 値を指定範囲内に丸める
 */
function clamp(value, min, max) {
  return Math.min(
    Math.max(value, min),
    max
  );
}


/*
 * スライダーと数値入力欄を同期
 */
function connectInputs(
  rangeInput,
  numberInput
) {
  rangeInput.addEventListener(
    "input",
    () => {
      numberInput.value =
        rangeInput.value;
    }
  );

  numberInput.addEventListener(
    "change",
    () => {
      let value =
        Number(numberInput.value);

      if (Number.isNaN(value)) {
        value =
          Number(rangeInput.min);
      }

      value = clamp(
        value,
        Number(rangeInput.min),
        Number(rangeInput.max)
      );

      const step =
        Number(rangeInput.step);

      if (step > 0) {
        value =
          Math.round(value / step) *
          step;
      }

      value =
        Number(value.toFixed(10));

      rangeInput.value = value;
      numberInput.value = value;
    }
  );
}


connectInputs(muInput, muNumber);

connectInputs(
  sigmaInput,
  sigmaNumber
);

connectInputs(
  initialValueInput,
  initialValueNumber
);

connectInputs(
  simulationTimeInput,
  simulationTimeNumber
);

connectInputs(
  pathsInput,
  pathsNumber
);

connectInputs(
  speedInput,
  speedNumber
);


/*
 * 標準正規分布 N(0, 1)
 * Box-Muller 法
 */
function normalRandom() {
  let u = 0;
  let v = 0;

  while (u === 0) {
    u = Math.random();
  }

  while (v === 0) {
    v = Math.random();
  }

  return (
    Math.sqrt(-2 * Math.log(u)) *
    Math.cos(2 * Math.PI * v)
  );
}


/*
 * 幾何Brown運動を生成
 *
 * dS = μSdt + σSdW
 *
 * 解：
 *
 * S_t = S_0 exp(
 *   (μ - σ²/2)t + σW_t
 * )
 */
function generatePaths() {
  const mu =
    Number(muInput.value);

  const sigma =
    Number(sigmaInput.value);

  const S0 =
    Number(initialValueInput.value);

  const T =
    Number(simulationTimeInput.value);

  const numberOfPaths =
    Number(pathsInput.value);

  const steps = 500;
  const dt = T / steps;

  paths = [];

  for (
    let p = 0;
    p < numberOfPaths;
    p++
  ) {
    const path = [S0];

    for (
      let i = 1;
      i <= steps;
      i++
    ) {
      const previous =
        path[i - 1];

      const z =
        normalRandom();

      /*
       * 幾何Brown運動の解を
       * 時間方向に離散化
       */
      const next =
        previous *
        Math.exp(
          (mu -
            0.5 *
            sigma *
            sigma) *
            dt +
          sigma *
            Math.sqrt(dt) *
            z
        );

      path.push(next);
    }

    paths.push(path);
  }
}


/*
 * キリのよい数値を使って
 * 縦軸の上限と目盛り間隔を決定
 */
function getNiceAxis(maxValue) {
  if (maxValue <= 0) {
    return {
      max: 1,
      step: 0.2
    };
  }

  const roughStep =
    maxValue / 5;

  const exponent =
    Math.floor(
      Math.log10(roughStep)
    );

  const base =
    Math.pow(10, exponent);

  const normalized =
    roughStep / base;

  let niceNormalized;

  if (normalized <= 1) {
    niceNormalized = 1;
  } else if (normalized <= 2) {
    niceNormalized = 2;
  } else if (normalized <= 5) {
    niceNormalized = 5;
  } else {
    niceNormalized = 10;
  }

  const step =
    niceNormalized * base;

  const axisMax =
    Math.ceil(maxValue / step) *
    step;

  return {
    max: axisMax,
    step: step
  };
}


/*
 * 縦軸範囲を取得
 *
 * 最小値は常に 0
 */
function getRange(visibleSteps) {
  let maxValue = 0;

  for (const path of paths) {
    for (
      let i = 0;
      i <= visibleSteps;
      i++
    ) {
      maxValue = Math.max(
        maxValue,
        path[i]
      );
    }
  }

  /*
   * グラフ上端に余白を持たせる
   */
  maxValue *= 1.1;

  const axis =
    getNiceAxis(maxValue);

  return {
    min: 0,
    max: axis.max,
    step: axis.step
  };
}


/*
 * パスごとの色を生成
 */
function getPathColor(
  index,
  total
) {
  const hue =
    (index /
      Math.max(total, 1)) *
    360;

  return (
    `hsl(${hue}, 70%, 65%)`
  );
}


/*
 * グラフ描画
 */
function draw(visibleSteps) {
  if (paths.length === 0) {
    return;
  }

  const width =
    canvas.clientWidth;

  const height =
    canvas.clientHeight;

  const padding = {
    left: 85,
    right: 25,
    top: 45,
    bottom: 60
  };

  ctx.clearRect(
    0,
    0,
    width,
    height
  );

  const chartWidth =
    width -
    padding.left -
    padding.right;

  const chartHeight =
    height -
    padding.top -
    padding.bottom;

  const range =
    getRange(visibleSteps);

  const totalSteps =
    paths[0].length - 1;

  const T =
    Number(
      simulationTimeInput.value
    );


  function x(i) {
    return (
      padding.left +
      (i / totalSteps) *
      chartWidth
    );
  }


  function y(value) {
    return (
      padding.top +
      (1 -
        value / range.max) *
        chartHeight
    );
  }


  /*
   * 座標軸
   */
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1;

  ctx.beginPath();

  ctx.moveTo(
    padding.left,
    padding.top
  );

  ctx.lineTo(
    padding.left,
    height - padding.bottom
  );

  ctx.lineTo(
    width - padding.right,
    height - padding.bottom
  );

  ctx.stroke();


  /*
   * 縦軸ラベル
   */
  ctx.save();

  ctx.fillStyle = "#ddd";
  ctx.font =
    "15px Hiragino Sans, sans-serif";

  ctx.textAlign = "center";

  ctx.translate(
    20,
    height / 2
  );

  ctx.rotate(
    -Math.PI / 2
  );

  ctx.fillText(
    "S_t",
    0,
    0
  );

  ctx.restore();


  /*
   * 横軸ラベル
   */
  ctx.fillStyle = "#ddd";

  ctx.font =
    "14px Hiragino Sans, sans-serif";

  ctx.textAlign = "center";

  ctx.fillText(
    "時間 t",
    padding.left +
      chartWidth / 2,
    height - 18
  );


  /*
   * 縦軸の目盛り
   *
   * 1, 2, 5 × 10^n の
   * キリのよい間隔を使用
   */
  ctx.textAlign = "right";

  const numberOfTicks =
    Math.round(
      range.max / range.step
    );

  for (
    let i = 0;
    i <= numberOfTicks;
    i++
  ) {
    const value =
      i * range.step;

    const py =
      y(value);

    ctx.strokeStyle = "#222";

    ctx.beginPath();

    ctx.moveTo(
      padding.left,
      py
    );

    ctx.lineTo(
      width -
        padding.right,
      py
    );

    ctx.stroke();

    ctx.fillStyle = "#999";

    ctx.fillText(
      formatAxisValue(value),
      padding.left - 10,
      py + 5
    );
  }


  /*
   * 横軸の目盛り
   */
  const timeTicks = 5;

  ctx.textAlign = "center";

  for (
    let i = 0;
    i <= timeTicks;
    i++
  ) {
    const time =
      (T * i) / timeTicks;

    const px =
      padding.left +
      (i / timeTicks) *
      chartWidth;

    ctx.strokeStyle = "#222";

    ctx.beginPath();

    ctx.moveTo(
      px,
      padding.top
    );

    ctx.lineTo(
      px,
      height -
        padding.bottom
    );

    ctx.stroke();

    ctx.fillStyle = "#999";

    ctx.fillText(
      formatAxisValue(time),
      px,
      height -
        padding.bottom +
        25
    );
  }


  /*
   * 幾何Brown運動のパスを描画
   */
  paths.forEach(
    (path, pathIndex) => {
      ctx.strokeStyle =
        getPathColor(
          pathIndex,
          paths.length
        );

      ctx.lineWidth =
        paths.length > 50
          ? 1
          : 1.3;

      ctx.beginPath();

      for (
        let i = 0;
        i <= visibleSteps;
        i++
      ) {
        if (i === 0) {
          ctx.moveTo(
            x(i),
            y(path[i])
          );
        } else {
          ctx.lineTo(
            x(i),
            y(path[i])
          );
        }
      }

      ctx.stroke();
    }
  );
}


/*
 * 軸の数値表示を整える
 */
function formatAxisValue(value) {
  if (
    Math.abs(value) >= 1000
  ) {
    return value.toLocaleString(
      "ja-JP",
      {
        maximumFractionDigits: 2
      }
    );
  }

  if (
    Number.isInteger(value)
  ) {
    return value.toString();
  }

  return value
    .toFixed(2)
    .replace(/\.?0+$/, "");
}


/*
 * シミュレーション開始
 */
function startSimulation() {
  cancelAnimationFrame(
    animationId
  );

  generatePaths();

  const steps =
    paths[0].length - 1;


  /*
   * 軌跡を一度に表示
   */
  if (mode.value === "all") {
    draw(steps);
    return;
  }


  /*
   * 徐々に描画
   */
  let visibleSteps = 0;
  let lastTime = null;

  function animate(
    currentTime
  ) {
    if (
      lastTime === null
    ) {
      lastTime =
        currentTime;
    }

    const elapsed =
      currentTime -
      lastTime;

    const speed =
      Number(
        speedInput.value
      );

    visibleSteps +=
      elapsed *
      0.15 *
      speed;

    const currentStep =
      Math.min(
        steps,
        Math.floor(
          visibleSteps
        )
      );

    draw(currentStep);

    lastTime =
      currentTime;

    if (
      currentStep < steps
    ) {
      animationId =
        requestAnimationFrame(
          animate
        );
    }
  }

  animationId =
    requestAnimationFrame(
      animate
    );
}


startButton.addEventListener(
  "click",
  startSimulation
);


startSimulation();