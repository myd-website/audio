type Fraction = { numerator: bigint; denominator: bigint };
type Value = Fraction | { approximateValue: number };
export type AngleMode = "deg" | "rad";
const abs = (value: bigint) => (value < 0n ? -value : value);
function fraction(numerator: bigint, denominator = 1n): Fraction {
  if (!denominator) throw new Error("除数不能为 0。");
  let a = abs(numerator),
    b = abs(denominator);
  while (b) [a, b] = [b, a % b];
  const divisor = a || 1n;
  numerator /= divisor;
  denominator /= divisor;
  if (denominator < 0n) {
    numerator = -numerator;
    denominator = -denominator;
  }
  if (
    abs(numerator).toString().length > 200 ||
    denominator.toString().length > 200
  )
    throw new Error("计算结果过大，请简化算式。");
  return { numerator, denominator };
}
function floating(value: number): Value {
  if (!Number.isFinite(value))
    throw new Error("计算结果超出实数范围或过大，请检查算式。");
  return { approximateValue: value };
}
const numeric = (value: Value) =>
  "approximateValue" in value
    ? value.approximateValue
    : Number(value.numerator) / Number(value.denominator);
function negate(value: Value): Value {
  return "approximateValue" in value
    ? floating(-value.approximateValue)
    : fraction(-value.numerator, value.denominator);
}
function display(value: Value) {
  if ("approximateValue" in value) {
    const number = value.approximateValue;
    // 极小值使用科学记数法，避免展示成 0；科学运算始终保留近似标记。
    const answer =
      number !== 0 && (Math.abs(number) < 1e-10 || Math.abs(number) >= 1e12)
        ? number.toExponential(11).replace(/\.?0+e/, "e")
        : String(Number(number.toFixed(10)));
    return { answer: answer.replace(/^-/, "−"), approximate: true };
  }
  const { numerator, denominator } = value;
  const negative = numerator < 0n ? "−" : "";
  const integer = abs(numerator) / denominator;
  let remainder = abs(numerator) % denominator,
    decimals = "";
  if (
    numerator !== 0n &&
    integer === 0n &&
    remainder * 10n ** 10n < denominator
  ) {
    let scaled = remainder,
      exponent = 0;
    while (scaled < denominator) {
      scaled *= 10n;
      exponent--;
    }
    const leading = scaled / denominator;
    remainder = scaled % denominator;
    for (let i = 0; i < 11 && remainder; i++) {
      remainder *= 10n;
      decimals += String(remainder / denominator);
      remainder %= denominator;
    }
    const digits = decimals.replace(/0+$/, "");
    return {
      answer: `${negative}${leading}${digits ? `.${digits}` : ""}e${exponent}`,
      approximate: remainder !== 0n,
    };
  }
  for (let i = 0; i < 10 && remainder; i++) {
    remainder *= 10n;
    decimals += String(remainder / denominator);
    remainder %= denominator;
  }
  return {
    answer: `${negative}${integer}${decimals ? `.${decimals}` : ""}`,
    approximate: remainder !== 0n,
  };
}
const exact = (value: Value) => {
  const shown = display(value);
  return "approximateValue" in value
    ? `≈${shown.answer}`
    : shown.approximate
      ? `(${value.numerator}/${value.denominator})`
      : shown.answer;
};
const functions = new Set([
  "sqrt",
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "ln",
  "log",
  "abs",
  "exp",
]);

// 仅对完全平方的有理数返回精确开方，其余进入近似计算。
function squareRoot(value: bigint) {
  if (value < 2n) return value;
  let root = value;
  let next = (root + 1n) / 2n;
  while (next < root) {
    root = next;
    next = (root + value / root) / 2n;
  }
  return root;
}

export function evaluateExpression(
  raw: string,
  options: { angleMode?: AngleMode } = {},
) {
  const angleMode = options.angleMode ?? "deg";
  const expression = raw
    .trim()
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–]/g, "-")
    .replace(/（/g, "(")
    .replace(/）/g, ")");
  if (
    !expression ||
    raw.length > 160 ||
    !/^[\da-zA-Zπ√\s.+*/()^!%\-]+$/.test(expression)
  )
    throw new Error(
      "请输入有效算式，支持四则运算、幂和科学函数，最多 160 个字符。",
    );
  let position = 0,
    depth = 0;
  const steps: string[] = [];
  const spaces = () => {
    while (
      /\s/.test(expression[position] || "") &&
      position < expression.length
    )
      position++;
  };
  function primary(): Value {
    spaces();
    let value: Value;
    const char = expression[position];
    if (char === "(") {
      position++;
      value = sum();
      spaces();
      if (expression[position++] !== ")") throw new Error("左右括号不匹配。");
    } else if (/[a-zA-Zπ√]/.test(char || "")) {
      const name = /^(?:[a-zA-Z]+|π|√)/.exec(expression.slice(position))![0];
      position += name.length;
      if (name === "pi" || name === "π") return floating(Math.PI);
      if (name === "e") return floating(Math.E);
      const functionName = name === "√" ? "sqrt" : name;
      if (!functions.has(functionName))
        throw new Error(`不支持的函数：${name}。`);
      spaces();
      if (expression[position++] !== "(")
        throw new Error(`${name} 后请使用括号，例如 ${name}(30)。`);
      const argument = sum();
      spaces();
      if (expression[position++] !== ")") throw new Error("左右括号不匹配。");
      value = applyFunction(functionName, argument);
    } else {
      const match = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(
        expression.slice(position),
      );
      if (!match) throw new Error("算式不完整，请检查数字和运算符。");
      position += match[0].length;
      const [mantissa, exponent = "0"] = match[0].split(/[eE]/);
      const [integer = "", decimal = ""] = mantissa.split(".");
      if (integer.length > 12 || decimal.length > 6)
        throw new Error("每个数最多支持 12 位整数、6 位小数。");
      value = fraction(
        BigInt((integer || "0") + decimal),
        10n ** BigInt(decimal.length),
      );
      const scale = Number(exponent);
      if (Math.abs(scale) > 100)
        throw new Error("科学记数法的指数须在 −100 到 100 之间。");
      if (scale > 0)
        value = fraction(
          value.numerator * 10n ** BigInt(scale),
          value.denominator,
        );
      if (scale < 0)
        value = fraction(
          value.numerator,
          value.denominator * 10n ** BigInt(-scale),
        );
    }
    return value;
  }
  function record(label: string, value: Value) {
    const shown = display(value);
    steps.push(
      `${label} ${"approximateValue" in value ? "≈" : "="} ${
        "approximateValue" in value ? shown.answer : exact(value)
      }`,
    );
    return value;
  }
  function applyFunction(name: string, value: Value): Value {
    const input = numeric(value);
    let result: Value;
    if (name === "sqrt") {
      if (input < 0) throw new Error("平方根的被开方数不能小于 0。");
      if (!("approximateValue" in value)) {
        const numerator = squareRoot(value.numerator);
        const denominator = squareRoot(value.denominator);
        if (
          numerator ** 2n === value.numerator &&
          denominator ** 2n === value.denominator
        )
          return record(
            `sqrt(${exact(value)})`,
            fraction(numerator, denominator),
          );
      }
      result = floating(Math.sqrt(input));
    } else if (name === "abs") {
      result = input < 0 ? negate(value) : value;
    } else if (name === "ln" || name === "log") {
      if (input <= 0) throw new Error("对数的真数必须大于 0。");
      result = floating(name === "ln" ? Math.log(input) : Math.log10(input));
    } else if (name === "asin" || name === "acos" || name === "atan") {
      const outsideUnit =
        "approximateValue" in value
          ? Math.abs(input) > 1
          : abs(value.numerator) > value.denominator;
      if (name !== "atan" && outsideUnit)
        throw new Error("反正弦和反余弦的输入须在 −1 到 1 之间。");
      const radians =
        name === "asin"
          ? Math.asin(input)
          : name === "acos"
            ? Math.acos(input)
            : Math.atan(input);
      result = floating(
        angleMode === "deg" ? (radians * 180) / Math.PI : radians,
      );
    } else if (name === "exp") {
      const number = Math.exp(input);
      if (number === 0) throw new Error("计算结果过小，超出支持的精度范围。");
      result = floating(number);
    } else {
      const radians = angleMode === "deg" ? (input * Math.PI) / 180 : input;
      const quarterTurns =
        angleMode === "deg" ? input / 90 : radians / (Math.PI / 2);
      if (
        name === "tan" &&
        Number.isInteger(quarterTurns) &&
        Math.abs(quarterTurns % 2) === 1
      )
        throw new Error("此角度的正切无定义。");
      const quadrant = ((quarterTurns % 4) + 4) % 4;
      result = floating(
        Number.isInteger(quarterTurns)
          ? name === "sin"
            ? [0, 1, 0, -1][quadrant]
            : name === "cos"
              ? [1, 0, -1, 0][quadrant]
              : 0
          : name === "sin"
            ? Math.sin(radians)
            : name === "cos"
              ? Math.cos(radians)
              : Math.tan(radians),
      );
    }
    const unit = ["sin", "cos", "tan", "asin", "acos", "atan"].includes(name)
      ? ` [${angleMode.toUpperCase()}]`
      : "";
    return record(`${name}(${exact(value)})${unit}`, result);
  }
  function operation(a: Value, b: Value, op: string): Value {
    const label = `${exact(a)} ${op === "*" ? "×" : op === "/" ? "÷" : op} ${exact(b)}`;
    if (op === "/" && numeric(b) === 0) throw new Error("除数不能为 0。");
    if (op === "^") {
      if (numeric(a) === 0 && numeric(b) <= 0)
        throw new Error("0 的非正数次幂无定义。");
      if (
        !("approximateValue" in a) &&
        !("approximateValue" in b) &&
        b.denominator === 1n
      ) {
        if (abs(b.numerator) > 1000n)
          throw new Error("整数幂的指数绝对值不能超过 1000。");
        const exponent = abs(b.numerator);
        return record(
          label,
          b.numerator < 0n
            ? fraction(a.denominator ** exponent, a.numerator ** exponent)
            : fraction(a.numerator ** exponent, a.denominator ** exponent),
        );
      }
      const number = Math.pow(numeric(a), numeric(b));
      if (number === 0 && numeric(a) !== 0)
        throw new Error("计算结果过小，超出支持的精度范围。");
      return record(label, floating(number));
    }
    // 四则运算继续使用精确分数，仅科学函数或常量参与时转为浮点近似。
    if ("approximateValue" in a || "approximateValue" in b) {
      const left = numeric(a),
        right = numeric(b);
      const number =
        op === "+"
          ? left + right
          : op === "-"
            ? left - right
            : op === "*"
              ? left * right
              : left / right;
      if (
        number === 0 &&
        left !== 0 &&
        right !== 0 &&
        (op === "*" || op === "/")
      )
        throw new Error("计算结果过小，超出支持的精度范围。");
      return record(label, floating(number));
    }
    const result =
      op === "+"
        ? fraction(
            a.numerator * b.denominator + b.numerator * a.denominator,
            a.denominator * b.denominator,
          )
        : op === "-"
          ? fraction(
              a.numerator * b.denominator - b.numerator * a.denominator,
              a.denominator * b.denominator,
            )
          : op === "*"
            ? fraction(a.numerator * b.numerator, a.denominator * b.denominator)
            : fraction(
                a.numerator * b.denominator,
                a.denominator * b.numerator,
              );
    return record(label, result);
  }
  function postfix(): Value {
    let value = primary();
    spaces();
    while (expression[position] === "!" || expression[position] === "%") {
      const op = expression[position++];
      if (op === "%") value = operation(value, fraction(100n), "/");
      else {
        // 阶乘只接受精确的非负整数，避免将近似结果误判为整数。
        if (
          "approximateValue" in value ||
          value.denominator !== 1n ||
          value.numerator < 0n ||
          value.numerator > 100n
        )
          throw new Error("阶乘仅支持 0 到 100 的精确整数。");
        let result = 1n;
        for (let i = 2n; i <= value.numerator; i++) result *= i;
        value = record(`${exact(value)}!`, fraction(result));
      }
      spaces();
    }
    return value;
  }
  function power(): Value {
    const value = postfix();
    spaces();
    // 幂右结合，且优先于一元负号：2^3^2 = 512，−2^2 = −4。
    if (expression[position] === "^") {
      position++;
      return operation(value, unary(), "^");
    }
    return value;
  }
  function unary(): Value {
    spaces();
    if (++depth > 24)
      throw new Error("括号、函数或正负号嵌套太多，请简化算式。");
    const char = expression[position];
    let value: Value;
    if (char === "+" || char === "-") {
      position++;
      value = unary();
      if (char === "-") value = negate(value);
    } else value = power();
    depth--;
    return value;
  }
  function product(): Value {
    let value = unary();
    spaces();
    while (["*", "/", "x", "X"].includes(expression[position])) {
      const op = expression[position++];
      value = operation(value, unary(), op === "x" || op === "X" ? "*" : op);
      spaces();
    }
    return value;
  }
  function sum(): Value {
    let value = product();
    spaces();
    while (expression[position] === "+" || expression[position] === "-") {
      const op = expression[position++];
      value = operation(value, product(), op);
      spaces();
    }
    return value;
  }
  // 白名单递归下降解析，不执行用户代码；精确值与近似值在整个调用链中区分。
  const value = sum();
  spaces();
  if (position !== expression.length)
    throw new Error("算式格式不正确，请检查括号或缺少的运算符。");
  return { expression: raw.trim(), ...display(value), steps };
}
