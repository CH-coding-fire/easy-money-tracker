import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../hooks/useTheme';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/spacing';

interface CalculatorModalProps {
  visible: boolean;
  initialValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

type Operator = '+' | '-' | '×' | '÷';

interface HistoryEntry {
  expression: string;
  result: string;
}

export function CalculatorModal({
  visible,
  initialValue,
  onConfirm,
  onCancel,
}: CalculatorModalProps) {
  const theme = useTheme();

  const [expression, setExpression] = useState('');
  const [currentNumber, setCurrentNumber] = useState('');
  const [result, setResult] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      const init = initialValue && !isNaN(Number(initialValue)) && Number(initialValue) > 0
        ? initialValue
        : '';
      setExpression(init ? '' : '');
      setCurrentNumber(init);
      setResult('');
      setHistory([]);
    }
  }, [visible, initialValue]);

  const evaluate = useCallback((expr: string): string => {
    try {
      // Replace display operators with JS operators
      const jsExpr = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/');

      // Safely evaluate the expression
      // Parse tokens: numbers and operators
      const tokens = jsExpr.match(/(\d+\.?\d*|[+\-*/])/g);
      if (!tokens) return '';

      // First pass: handle * and /
      const stack: (number | string)[] = [];
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token === '*' || token === '/') {
          const prev = stack.pop() as number;
          const next = parseFloat(tokens[++i]);
          if (isNaN(next)) return '';
          stack.push(token === '*' ? prev * next : prev / next);
        } else if (token === '+' || token === '-') {
          stack.push(token);
        } else {
          stack.push(parseFloat(token));
        }
      }

      // Second pass: handle + and -
      let total = stack[0] as number;
      for (let i = 1; i < stack.length; i += 2) {
        const op = stack[i] as string;
        const num = stack[i + 1] as number;
        if (op === '+') total += num;
        else if (op === '-') total -= num;
      }

      if (isNaN(total) || !isFinite(total)) return 'Error';

      // Format: remove trailing zeros after decimal
      const formatted = parseFloat(total.toFixed(10)).toString();
      return formatted;
    } catch {
      return 'Error';
    }
  }, []);

  // Live-evaluate as user types
  const liveEvaluate = useCallback(
    (expr: string, current: string) => {
      const full = expr + current;
      // Only evaluate if the expression has an operator
      if (/[+\-×÷]/.test(full) && current.length > 0) {
        const res = evaluate(full);
        setResult(res);
      } else {
        setResult('');
      }
    },
    [evaluate],
  );

  const handleNumber = useCallback(
    (num: string) => {
      // Prevent multiple decimals
      if (num === '.' && currentNumber.includes('.')) return;
      // Prevent leading zeros (except "0.")
      if (currentNumber === '0' && num !== '.') {
        const next = num;
        setCurrentNumber(next);
        liveEvaluate(expression, next);
        return;
      }
      const next = currentNumber + num;
      setCurrentNumber(next);
      liveEvaluate(expression, next);
    },
    [currentNumber, expression, liveEvaluate],
  );

  const handleOperator = useCallback(
    (op: Operator) => {
      if (currentNumber === '' && expression === '') return;
      // If current is empty but expression ends with operator, replace it
      if (currentNumber === '' && expression.length > 0) {
        const trimmed = expression.trimEnd();
        const lastChar = trimmed[trimmed.length - 1];
        if (['+', '-', '×', '÷'].includes(lastChar)) {
          setExpression(trimmed.slice(0, -1) + op + ' ');
          return;
        }
      }
      const newExpr = expression + currentNumber + ' ' + op + ' ';
      setExpression(newExpr);
      setCurrentNumber('');
      // Don't clear result - keep showing the running total
    },
    [currentNumber, expression],
  );

  const handleEquals = useCallback(() => {
    const full = expression + currentNumber;
    if (!full || !/[+\-×÷]/.test(full)) return;
    const res = evaluate(full);
    if (res && res !== 'Error') {
      setHistory((prev) => [{ expression: full, result: res }, ...prev]);
      setExpression('');
      setCurrentNumber(res);
      setResult('');
    }
  }, [expression, currentNumber, evaluate]);

  const handleClear = useCallback(() => {
    setExpression('');
    setCurrentNumber('');
    setResult('');
  }, []);

  const handleBackspace = useCallback(() => {
    if (currentNumber.length > 0) {
      const next = currentNumber.slice(0, -1);
      setCurrentNumber(next);
      liveEvaluate(expression, next);
    } else if (expression.length > 0) {
      // Remove last operator + spaces
      const trimmed = expression.trimEnd();
      const parts = trimmed.split(' ');
      parts.pop(); // remove operator
      const newExpr = parts.length > 0 ? parts.join(' ') + ' ' : '';
      // The last number before the operator becomes currentNumber
      if (parts.length > 0) {
        const lastPart = parts.pop() || '';
        if (/^\d/.test(lastPart)) {
          setExpression(parts.length > 0 ? parts.join(' ') + ' ' : '');
          setCurrentNumber(lastPart);
          liveEvaluate(parts.length > 0 ? parts.join(' ') + ' ' : '', lastPart);
        } else {
          setExpression(newExpr);
          liveEvaluate(newExpr, '');
        }
      } else {
        setExpression('');
        liveEvaluate('', '');
      }
    }
  }, [currentNumber, expression, liveEvaluate]);

  const handleUseAmount = useCallback(() => {
    // If there's a pending calculation, evaluate it first
    const full = expression + currentNumber;
    let finalValue = currentNumber;
    if (/[+\-×÷]/.test(full) && currentNumber.length > 0) {
      const res = evaluate(full);
      if (res && res !== 'Error') {
        finalValue = res;
      }
    }
    // If result is showing, use that
    if (result && result !== 'Error') {
      finalValue = result;
    }
    if (finalValue && !isNaN(Number(finalValue)) && Number(finalValue) > 0) {
      onConfirm(finalValue);
    }
  }, [expression, currentNumber, result, evaluate, onConfirm]);

  const displayExpression = expression + currentNumber;
  const displayValue = result || currentNumber || '0';

  const buttonColor = theme.cardBackground;
  const operatorColor = `${theme.primary}25`;
  const actionColor = `${theme.warning}20`;

  const renderButton = (
    label: string,
    onPress: () => void,
    bgColor: string,
    textColor: string,
    flex?: number,
    textSize?: number,
  ) => (
    <TouchableOpacity
      key={label}
      style={[
        calcStyles.button,
        { backgroundColor: bgColor, flex: flex || 1 },
      ]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Text
        style={[
          calcStyles.buttonText,
          { color: textColor, fontSize: textSize || 20 },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable
        style={[calcStyles.overlay, { backgroundColor: theme.overlay }]}
        onPress={onCancel}
      >
        <Pressable
          style={[calcStyles.container, { backgroundColor: theme.cardBackground }]}
          onPress={() => {}} // prevent dismiss when tapping inside
        >
          {/* Header */}
          <View style={calcStyles.header}>
            <View style={calcStyles.headerLeft}>
              <Ionicons name="calculator-outline" size={22} color={theme.primary} />
              <Text style={[calcStyles.title, { color: theme.text.primary }]}>
                Calculator
              </Text>
            </View>
            <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={theme.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Display */}
          <View style={[calcStyles.display, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={calcStyles.expressionScroll}>
              <Text
                style={[calcStyles.expressionText, { color: theme.text.tertiary }]}
                numberOfLines={1}
              >
                {displayExpression || ' '}
              </Text>
            </ScrollView>
            <Text
              style={[
                calcStyles.resultText,
                {
                  color: result ? theme.primary : theme.text.primary,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {displayValue}
            </Text>
          </View>

          {/* History (last 3) */}
          {history.length > 0 && (
            <View style={calcStyles.historyContainer}>
              {history.slice(0, 3).map((h, i) => (
                <TouchableOpacity
                  key={i}
                  style={calcStyles.historyRow}
                  onPress={() => {
                    setExpression('');
                    setCurrentNumber(h.result);
                    setResult('');
                  }}
                >
                  <Text
                    style={[calcStyles.historyExpr, { color: theme.text.tertiary }]}
                    numberOfLines={1}
                  >
                    {h.expression} =
                  </Text>
                  <Text
                    style={[calcStyles.historyResult, { color: theme.text.secondary }]}
                    numberOfLines={1}
                  >
                    {h.result}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Buttons */}
          <View style={calcStyles.buttonsContainer}>
            {/* Row 1 */}
            <View style={calcStyles.buttonRow}>
              {renderButton('C', handleClear, actionColor, theme.warning)}
              {renderButton('⌫', handleBackspace, actionColor, theme.warning)}
              {renderButton('÷', () => handleOperator('÷'), operatorColor, theme.primary)}
              {renderButton('×', () => handleOperator('×'), operatorColor, theme.primary)}
            </View>
            {/* Row 2 */}
            <View style={calcStyles.buttonRow}>
              {renderButton('7', () => handleNumber('7'), buttonColor, theme.text.primary)}
              {renderButton('8', () => handleNumber('8'), buttonColor, theme.text.primary)}
              {renderButton('9', () => handleNumber('9'), buttonColor, theme.text.primary)}
              {renderButton('-', () => handleOperator('-'), operatorColor, theme.primary)}
            </View>
            {/* Row 3 */}
            <View style={calcStyles.buttonRow}>
              {renderButton('4', () => handleNumber('4'), buttonColor, theme.text.primary)}
              {renderButton('5', () => handleNumber('5'), buttonColor, theme.text.primary)}
              {renderButton('6', () => handleNumber('6'), buttonColor, theme.text.primary)}
              {renderButton('+', () => handleOperator('+'), operatorColor, theme.primary)}
            </View>
            {/* Row 4 */}
            <View style={calcStyles.buttonRow}>
              {renderButton('1', () => handleNumber('1'), buttonColor, theme.text.primary)}
              {renderButton('2', () => handleNumber('2'), buttonColor, theme.text.primary)}
              {renderButton('3', () => handleNumber('3'), buttonColor, theme.text.primary)}
              {renderButton('=', handleEquals, `${theme.success}30`, theme.success, 1, 22)}
            </View>
            {/* Row 5 */}
            <View style={calcStyles.buttonRow}>
              {renderButton('0', () => handleNumber('0'), buttonColor, theme.text.primary, 2)}
              {renderButton('.', () => handleNumber('.'), buttonColor, theme.text.primary)}
              <View style={{ flex: 1 }} />
            </View>
          </View>

          {/* Use Amount Button */}
          <TouchableOpacity
            style={[
              calcStyles.useAmountBtn,
              {
                backgroundColor: theme.primary,
                opacity:
                  (currentNumber || result) &&
                  !isNaN(Number(currentNumber || result)) &&
                  Number(currentNumber || result) > 0
                    ? 1
                    : 0.4,
              },
            ]}
            onPress={handleUseAmount}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={calcStyles.useAmountText}>Use Amount</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const calcStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  display: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    minHeight: 80,
    justifyContent: 'flex-end',
  },
  expressionScroll: {
    maxHeight: 24,
    marginBottom: SPACING.xs,
  },
  expressionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '400',
  },
  resultText: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'right',
  },
  historyContainer: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  historyExpr: {
    fontSize: FONT_SIZE.xs,
    flex: 1,
    marginRight: SPACING.sm,
  },
  historyResult: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  buttonsContainer: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  button: {
    height: 52,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '600',
  },
  useAmountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  useAmountText: {
    color: '#fff',
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
});
