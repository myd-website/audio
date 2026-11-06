export const arithmeticOperations = [
  { id: "add", name: "加法", symbol: "+" },
  { id: "subtract", name: "减法", symbol: "−" },
  { id: "multiply", name: "乘法", symbol: "×" },
  { id: "divide", name: "除法", symbol: "÷" },
] as const;

export type ArithmeticOperation = (typeof arithmeticOperations)[number]["id"];

export interface CalculationRow {
  text: string;
  operator?: string;
  kind?: "hint" | "result";
  rule?: boolean;
}

export interface CalculationResult {
  expression: string;
  answer: string;
  approximate: boolean;
  notes: string[];
  rows: CalculationRow[];
  steps: string[];
  division?: {
    dividend: string;
    divisor: string;
    quotient: string;
  };
}

interface Decimal {
  value: bigint;
  scale: number;
  text: string;
}

const MAX_INTEGER_DIGITS = 12;
const MAX_DECIMAL_DIGITS = 6;
const DIVISION_PRECISION = 10;
const powerOfTen = (scale: number) => 10n ** BigInt(scale);
const absolute = (value: bigint) => (value < 0n ? -value : value);

function formatDecimal(value: bigint, scale: number, trim = true): string {
  const digits = absolute(value)
    .toString()
    .padStart(scale + 1, "0");
  const integer = scale ? digits.slice(0, -scale) : digits;
  let fraction = scale ? digits.slice(-scale) : "";
  if (trim) fraction = fraction.replace(/0+$/, "");
  return `${value < 0n ? "−" : ""}${integer}${fraction ? `.${fraction}` : ""}`;
}

function parseDecimal(input: string, label: string): Decimal {
  const text = input.trim().replace(/−/g, "-");
  if (!text) throw new Error(`请输入${label}。`);
  if (text.length > 32 || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) {
    throw new Error(`${label}请输入有效数字，支持负数和小数。`);
  }
  const negative = text.startsWith("-");
  const [rawInteger, fraction = ""] = text.replace(/^[+-]/, "").split(".");
  const integer = rawInteger.replace(/^0+/, "") || "0";
  if (
    integer.length > MAX_INTEGER_DIGITS ||
    fraction.length > MAX_DECIMAL_DIGITS
  ) {
    throw new Error(`${label}最多支持 12 位整数和 6 位小数。`);
  }
  const value = BigInt(integer + fraction) * (negative ? -1n : 1n);
  return {
    value,
    scale: fraction.length,
    text: formatDecimal(value, fraction.length),
  };
}

const atScale = (number: Decimal, scale: number) =>
  number.value * powerOfTen(scale - number.scale);

function positionName(index: number, scale: number): string {
  const exponent = index - scale;
  const integerNames = [
    "个位",
    "十位",
    "百位",
    "千位",
    "万位",
    "十万位",
    "百万位",
    "千万位",
    "亿位",
    "十亿位",
    "百亿位",
    "千亿位",
    "万亿位",
  ];
  const decimalNames = [
    "十分位",
    "百分位",
    "千分位",
    "万分位",
    "十万分位",
    "百万分位",
  ];
  return exponent < 0
    ? decimalNames[-exponent - 1]
    : integerNames[exponent] || `10 的 ${exponent} 次方位`;
}

function insertDecimalSpace(text: string, scale: number): string {
  return scale ? `${text.slice(0, -scale)} ${text.slice(-scale)}` : text;
}

function calculateAdditionOrSubtraction(
  left: Decimal,
  right: Decimal,
  operation: "add" | "subtract",
): CalculationResult {
  const scale = Math.max(left.scale, right.scale);
  const first = atScale(left, scale);
  const second = atScale(right, scale) * (operation === "subtract" ? -1n : 1n);
  const total = first + second;
  const sameSign = first < 0n === second < 0n;
  // 异号先比较绝对值，用“大数减小数”展示借位，最后恢复结果的符号。
  const isAddition = sameSign;
  const a = isAddition
    ? absolute(first)
    : absolute(first) > absolute(second)
      ? absolute(first)
      : absolute(second);
  const b = isAddition
    ? absolute(second)
    : absolute(first) > absolute(second)
      ? absolute(second)
      : absolute(first);
  const digitsA = a.toString().padStart(scale + 1, "0");
  const digitsB = b.toString().padStart(scale + 1, "0");
  const width = Math.max(digitsA.length, digitsB.length);
  const top = digitsA.padStart(width, "0");
  const bottom = digitsB.padStart(width, "0");
  const markers = Array<string>(width + 1).fill(" ");
  const steps: string[] = [];
  const notes = [
    scale
      ? "先把小数点对齐，末尾补 0，再从最低位开始计算。"
      : "把相同数位对齐，从个位开始计算。",
  ];
  if (left.value < 0n || right.value < 0n || total < 0n) {
    notes.push(
      `原式按带符号的加法处理：${formatDecimal(first, scale)} + (${formatDecimal(second, scale)})。${isAddition ? "同号时绝对值相加，保留共同符号。" : "异号时绝对值相减，取绝对值较大一方的符号。"}`,
      `竖式先计算 ${formatDecimal(a, scale)} ${isAddition ? "+" : "−"} ${formatDecimal(b, scale)}，${total === 0n ? "两数抵消，结果为 0" : total < 0n ? "最终结果加上负号" : "最终结果为正数"}。`,
    );
  }
  let carryOrBorrow = 0;
  for (let index = width - 1; index >= 0; index--) {
    const digitA = Number(top[index]);
    const digitB = Number(bottom[index]);
    const incoming = carryOrBorrow;
    const place = positionName(width - 1 - index, scale);
    if (isAddition) {
      const sum = digitA + digitB + incoming;
      carryOrBorrow = Math.floor(sum / 10);
      if (carryOrBorrow) markers[index] = "1";
      steps.push(
        `${place}：${digitA} + ${digitB}${incoming ? " + 进位 1" : ""} = ${sum}，写 ${sum % 10}${carryOrBorrow ? "，向前一位进 1" : ""}。`,
      );
    } else {
      const available = digitA - incoming;
      carryOrBorrow = available < digitB ? 1 : 0;
      if (carryOrBorrow) markers[index] = "·";
      const difference = available + carryOrBorrow * 10 - digitB;
      steps.push(
        `${place}：${digitA}${incoming ? " − 上一位借走的 1" : ""}${carryOrBorrow ? ` 不够减 ${digitB}，向前一位借 1，得到 ${available + 10}` : ` = ${available}`}；${available + carryOrBorrow * 10} − ${digitB} = ${difference}，写 ${difference}。`,
      );
    }
  }
  if (isAddition && carryOrBorrow)
    steps.push("最高位还有进位 1，在最前面写 1。");
  const rows: CalculationRow[] = [];
  if (markers.some((marker) => marker !== " ")) {
    rows.push({
      text: insertDecimalSpace(markers.join(""), scale),
      kind: "hint",
    });
    notes.push(
      isAddition
        ? "竖式上方的小 1 表示进位。"
        : "竖式上方的圆点表示该列借出了 1 给后一位；跨零连续借位的变化见下方步骤。",
    );
  }
  rows.push(
    { text: formatDecimal(a, scale, false) },
    {
      text: formatDecimal(b, scale, false),
      operator: isAddition ? "+" : "−",
      rule: true,
    },
    { text: formatDecimal(absolute(total), scale, false), kind: "result" },
  );
  const answer = formatDecimal(total, scale);
  steps.push(`所以结果是 ${answer}。`);
  return { expression: "", answer, approximate: false, rows, steps, notes };
}

function calculateMultiplication(
  left: Decimal,
  right: Decimal,
): CalculationResult {
  const a = absolute(left.value);
  const b = absolute(right.value);
  const multiplier = b.toString();
  const scale = left.scale + right.scale;
  const product = left.value * right.value;
  const rows: CalculationRow[] = [
    { text: a.toString() },
    { text: b.toString(), operator: "×", rule: true },
  ];
  const steps: string[] = [];
  const notes = [
    scale
      ? "先忽略小数点，按整数乘法计算。"
      : "从乘数的个位开始，逐位相乘，再把各行积相加。",
  ];
  if (left.value < 0n || right.value < 0n)
    notes.push("竖式先计算绝对值；两数同号得正，异号得负，0 的结果仍为 0。");
  for (let index = multiplier.length - 1; index >= 0; index--) {
    const digit = Number(multiplier[index]);
    const shift = multiplier.length - 1 - index;
    let carry = 0;
    const columnDetails: string[] = [];
    const multiplicand = a.toString();
    for (let column = multiplicand.length - 1; column >= 0; column--) {
      const current = Number(multiplicand[column]);
      const value = current * digit + carry;
      columnDetails.push(
        `${current} × ${digit}${carry ? ` + 进位 ${carry}` : ""} = ${value}，写 ${value % 10}${value >= 10 ? ` 进 ${Math.floor(value / 10)}` : ""}`,
      );
      carry = Math.floor(value / 10);
    }
    if (carry) columnDetails.push(`最高位写进位 ${carry}`);
    const partial = a * BigInt(digit);
    steps.push(
      `乘数${positionName(shift, 0)}是 ${digit}：${columnDetails.join("；")}。本行积为 ${partial}${shift ? `，向左移动 ${shift} 位，相当于 ${partial * powerOfTen(shift)}` : ""}。`,
    );
    if (multiplier.length > 1)
      rows.push({ text: `${partial}${" ".repeat(shift)}`, rule: index === 0 });
  }
  rows.push({
    text: absolute(left.value * right.value).toString(),
    kind: "result",
  });
  if (multiplier.length > 1) steps.push(`各行积相加，得到整数积 ${a * b}。`);
  const answer = formatDecimal(product, scale);
  if (scale)
    steps.push(
      `两个因数一共有 ${scale} 位小数，把整数积的小数点向左移动 ${scale} 位，不足的位补 0。`,
    );
  steps.push(`所以结果是 ${answer}。`);
  return { expression: "", answer, approximate: false, rows, steps, notes };
}

function calculateDivision(left: Decimal, right: Decimal): CalculationResult {
  if (right.value === 0n) throw new Error("除数不能为 0，请修改第二个数。");
  const scale = Math.max(left.scale, right.scale);
  const dividend = absolute(atScale(left, scale));
  const divisor = absolute(atScale(right, scale));
  const integerDigits = dividend.toString();
  const steps: string[] = [];
  const work: {
    partial: bigint;
    product: bigint;
    remainder: bigint;
    index: number;
  }[] = [];
  const notes = [
    scale
      ? `被除数和除数同时乘以 ${powerOfTen(scale)}，转成 ${dividend} ÷ ${divisor}，商不变。`
      : "从被除数的最高位开始，依次试商、相乘、相减，再落下一位。",
  ];
  if (left.value < 0n || right.value < 0n)
    notes.push("先按绝对值做除法；两数同号得正，异号得负。");
  let remainder = 0n;
  let quotient = "";
  let fraction = "";
  const divideDigit = (digit: string, index: number, decimalPlace = 0) => {
    const partial = remainder * 10n + BigInt(digit);
    const quotientDigit = partial / divisor;
    const product = quotientDigit * divisor;
    remainder = partial - product;
    steps.push(
      `${decimalPlace ? `余数后补 0，计算小数第 ${decimalPlace} 位` : `落下数字 ${digit}`}，得到 ${partial}；${partial} ÷ ${divisor}，这一位商 ${quotientDigit}；${quotientDigit} × ${divisor} = ${product}，${partial} − ${product} = ${remainder}。`,
    );
    work.push({ partial, product, remainder, index });
    return quotientDigit.toString();
  };
  for (let index = 0; index < integerDigits.length; index++)
    quotient += divideDigit(integerDigits[index], index);
  quotient = quotient.replace(/^0+(?=\d)/, "");
  while (remainder !== 0n && fraction.length < DIVISION_PRECISION) {
    fraction += divideDigit(
      "0",
      integerDigits.length + fraction.length,
      fraction.length + 1,
    );
  }
  const approximate = remainder !== 0n;
  const negative = left.value < 0n !== right.value < 0n && dividend !== 0n;
  const unsignedAnswer = `${quotient}${fraction ? `.${fraction}` : ""}`;
  const answer = `${negative ? "−" : ""}${unsignedAnswer}${approximate ? "…" : ""}`;
  if (approximate) {
    notes.push(
      `小数最多展示 ${DIVISION_PRECISION} 位，当前仍有余数，使用“≈”并以省略号表示后续小数，未四舍五入。`,
    );
    steps.push(
      `小数已计算 ${DIVISION_PRECISION} 位，余数为 ${remainder}，因此 ${answer} 是截取展示的近似结果。`,
    );
  } else steps.push(`余数为 0，计算结束，结果是 ${answer}。`);
  const width = integerDigits.length + fraction.length;
  const alignWork = (value: bigint, index: number) => {
    const text = value
      .toString()
      .padStart(index + 1, " ")
      .padEnd(width, " ");
    // 工作行的小数点列留空，保证补零后的每一位仍与被除数对齐。
    return fraction
      ? `${text.slice(0, integerDigits.length)} ${text.slice(integerDigits.length)}`
      : text;
  };
  const rows: CalculationRow[] = [];
  // 开头不足除的数位先合并，余数行同时落下下一位，形成常见的长除法竖式。
  const firstWorkIndex = work.findIndex(
    (item) => item.product !== 0n || item.index === integerDigits.length - 1,
  );
  for (let index = firstWorkIndex; index < work.length; index++) {
    const item = work[index];
    const next = work[index + 1];
    rows.push(
      { text: alignWork(item.product, item.index), operator: "−", rule: true },
      next
        ? { text: alignWork(next.partial, next.index) }
        : { text: alignWork(item.remainder, item.index), kind: "result" },
    );
  }
  return {
    expression: "",
    answer,
    approximate,
    steps,
    notes,
    rows,
    division: {
      dividend: `${integerDigits}${fraction ? `.${"0".repeat(fraction.length)}` : ""}`,
      divisor: divisor.toString(),
      quotient: unsignedAnswer,
    },
  };
}

/** 使用十进制定点整数计算，避免 0.1 + 0.2 等浮点误差，也不执行用户输入的表达式。 */
export function calculateArithmetic(
  leftInput: string,
  rightInput: string,
  operation: ArithmeticOperation,
): CalculationResult {
  const selected = arithmeticOperations.find((item) => item.id === operation);
  if (!selected) throw new Error("请选择有效的运算方式。");
  const left = parseDecimal(leftInput, "第一个数");
  const right = parseDecimal(rightInput, "第二个数");
  const result =
    operation === "multiply"
      ? calculateMultiplication(left, right)
      : operation === "divide"
        ? calculateDivision(left, right)
        : calculateAdditionOrSubtraction(left, right, operation);
  const displayOperand = (number: Decimal) =>
    number.value < 0n ? `(${number.text})` : number.text;
  result.expression = `${displayOperand(left)} ${selected.symbol} ${displayOperand(right)}`;
  return result;
}
