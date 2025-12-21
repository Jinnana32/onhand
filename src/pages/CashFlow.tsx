import { useState, useMemo } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import {
  useLiabilities,
  useExpenses,
  useIncomeSources,
  useBudgets,
  useProfile,
} from '../hooks';
import { formatCurrency } from '../lib/utils';
import {
  Typography,
  Space,
  Button,
  Select,
  Dropdown,
  Segmented,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Checkbox,
  Modal,
  Alert,
  Descriptions,
  Empty,
  Skeleton,
  List,
  Badge,
  message,
  Form,
  InputNumber,
  DatePicker,
  Input,
  Switch,
} from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  FilterOutlined,
  EditOutlined,
  PlusOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Title, Text } = Typography;
const { Option } = Select;

const expenseCategories = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Entertainment',
  'Healthcare',
  'Education',
  'Other',
];

type ViewMode = 'calendar' | 'list';
type FilterGroup =
  | 'recurring_expenses'
  | 'credit_cards'
  | 'loans'
  | 'installments'
  | 'income'
  | 'budget'
  | 'other';

export function CashFlow() {
  const { liabilities, isLoading: isLoadingLiabilities } = useLiabilities();
  const {
    expenses,
    isLoading: isLoadingExpenses,
    createExpenseAsync,
    updateExpense,
  } = useExpenses();
  const {
    incomeSources,
    isLoading: isLoadingIncome,
    updateIncomeSourceAsync,
    createIncomeSourceAsync,
  } = useIncomeSources();
  const { budgets, isLoading: isLoadingBudgets } = useBudgets();
  const {
    profile,
    isLoading: isLoadingProfile,
    updateProfile,
    isUpdating: isUpdatingProfile,
  } = useProfile();
  const isLoading =
    isLoadingLiabilities ||
    isLoadingExpenses ||
    isLoadingIncome ||
    isLoadingBudgets ||
    isLoadingProfile;
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedFilters, setSelectedFilters] = useState<FilterGroup[]>([]);
  const [paidFilter, setPaidFilter] = useState<
    'all' | 'paid' | 'unpaid' | 'unchecked'
  >('all');
  const [pendingBill, setPendingBill] = useState<{
    bill: {
      type: 'liability' | 'expense' | 'income' | 'budget';
      id: string;
      name: string;
      amount: number;
      isPaid: boolean;
    };
    year: number;
    month: number;
  } | null>(null);
  const [isEditCashModalOpen, setIsEditCashModalOpen] = useState(false);
  const [cashForm] = Form.useForm();
  const [expenseForm] = Form.useForm();
  const [billForm] = Form.useForm();
  const [expenseOverrideForm] = Form.useForm();
  const [liabilityOverrideForm] = Form.useForm();
  const [pendingIncome, setPendingIncome] = useState<{
    income: {
      id: string;
      name: string;
      amount: number;
      frequency?: 'monthly' | 'weekly' | 'one_time';
      category?: 'salary' | 'project' | 'other';
    };
    year: number;
    month: number;
  } | null>(null);
  const [pendingExpense, setPendingExpense] = useState<{
    expense: {
      id: string;
      name: string;
      amount: number;
      frequency: 'monthly' | 'weekly';
    };
    year: number;
    month: number;
  } | null>(null);
  const [editingExpenseOverride, setEditingExpenseOverride] = useState<{
    expense: {
      id: string;
      name: string;
      amount: number;
      category: string | null;
      frequency: 'monthly' | 'weekly';
    };
    year: number;
    month: number;
  } | null>(null);
  const [editingLiabilityOverride, setEditingLiabilityOverride] = useState<{
    liability: {
      id: string;
      name: string;
      amount: number;
    };
    year: number;
    month: number;
  } | null>(null);
  const [selectedBudgetForExpense, setSelectedBudgetForExpense] = useState<{
    budget: {
      id: string;
      name: string;
    };
    year: number;
    month: number;
  } | null>(null);
  const [budgetExpenseForm] = Form.useForm();

  // Get month name
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // Helper function to get filter group for a bill
  const getBillFilterGroup = (bill: {
    type: 'liability' | 'expense' | 'income' | 'budget';
    category: string;
    payment_type?: 'straight' | 'installment' | null;
  }): FilterGroup => {
    if (bill.type === 'income') {
      return 'income';
    }
    if (bill.type === 'budget') {
      return 'budget';
    }
    if (bill.type === 'expense') {
      return 'recurring_expenses';
    }
    if (bill.category === 'credit_card') {
      // Credit card with installment payment_type goes to installments
      if (bill.payment_type === 'installment') {
        return 'installments';
      }
      return 'credit_cards';
    }
    if (bill.category === 'loan') {
      return 'loans';
    }
    if (bill.category === 'recurring_bill') {
      return 'recurring_expenses'; // Group recurring bills with recurring expenses
    }
    return 'other';
  };

  // Helper function to check if a bill is paid for a specific month
  // We check if there's an expense with the liability_id that was created
  // during or after the bill's due month (to handle cases where payment is made late)
  const isBillPaid = useMemo(() => {
    return (liabilityId: string, year: number, month: number) => {
      if (!expenses) return false;

      // Find all expenses for this liability
      const liabilityExpenses = expenses.filter(
        (e) => e.liability_id === liabilityId
      );

      if (liabilityExpenses.length === 0) return false;

      // Check if any expense was created in the same month or later
      // This handles both early payments (paying before due date) and late payments
      const billMonthStart = new Date(year, month, 1);
      billMonthStart.setHours(0, 0, 0, 0);

      return liabilityExpenses.some((expense) => {
        const expenseDate = new Date(expense.expense_date);
        expenseDate.setHours(0, 0, 0, 0);
        // Expense must be created in the same month or later (handles early and late payments)
        // Compare by year and month to handle payments made before or after the due date
        const expenseYear = expenseDate.getFullYear();
        const expenseMonth = expenseDate.getMonth();
        const billYear = year;
        const billMonth = month;

        // Payment is valid if it's in the same month or later
        return (
          expenseYear > billYear ||
          (expenseYear === billYear && expenseMonth >= billMonth)
        );
      });
    };
  }, [expenses]);

  // Filter active liabilities, recurring expenses, recurring income, and budgets, calculate which ones are due in the selected month
  const billsForMonth = useMemo(() => {
    const bills: Array<{
      type: 'liability' | 'expense' | 'income' | 'budget';
      id: string; // liability id, expense id, income id, or budget id
      name: string;
      amount: number;
      category: string;
      payment_type?: 'straight' | 'installment' | null;
      source?: string | null;
      dueDate: Date;
      isPaid: boolean;
      isReceived?: boolean; // For income: whether it has been received
      frequency?: 'monthly' | 'weekly' | 'one_time'; // For expenses: frequency type
      liability?: { start_date: string | null; months_to_pay: number | null }; // For payment counter
      budgetExpenses?: Array<{
        // For budgets: nested expenses
        type: 'expense';
        id: string;
        name: string;
        amount: number;
        category: string;
        dueDate: Date;
        isPaid: boolean;
        frequency?: 'monthly' | 'weekly' | 'one_time';
      }>;
    }> = [];
    const selectedMonthDate = new Date(selectedYear, selectedMonth, 1);
    const selectedMonthEndDate = new Date(selectedYear, selectedMonth + 1, 0);

    // Process liabilities
    if (liabilities) {
      const activeLiabilities = liabilities.filter((l) => l.is_active);

      // Get all override expenses (one-time expenses with "(Override)" in description and linked to a liability)
      const overrideExpenses =
        expenses?.filter(
          (e) =>
            e.frequency === 'one_time' &&
            e.description.includes('(Override)') &&
            e.liability_id
        ) || [];

      activeLiabilities.forEach((liability) => {
        // Check if liability is within payment period
        const startDate = liability.start_date
          ? new Date(liability.start_date)
          : new Date(liability.created_at);
        startDate.setHours(0, 0, 0, 0);

        let endDate: Date | null = null;
        if (liability.months_to_pay !== null && liability.months_to_pay > 0) {
          endDate = new Date(startDate);
          // If months_to_pay = 1, end date should be the last day of the start month
          // For months_to_pay > 1, end date is the last day of the (months_to_pay - 1)th month after start
          if (liability.months_to_pay === 1) {
            // Set to last day of the start month
            endDate = new Date(
              startDate.getFullYear(),
              startDate.getMonth() + 1,
              0
            );
          } else {
            // For months_to_pay > 1, set to last day of the (months_to_pay - 1)th month
            endDate.setMonth(endDate.getMonth() + liability.months_to_pay - 1);
            endDate = new Date(
              endDate.getFullYear(),
              endDate.getMonth() + 1,
              0
            );
          }
          endDate.setHours(23, 59, 59, 999);
        }

        // Check if selected month is within payment period
        if (endDate && selectedMonthDate > endDate) {
          return; // Payment period has ended
        }
        if (selectedMonthEndDate < startDate) {
          return; // Payment period hasn't started yet
        }

        const dueDay = liability.due_date;
        const dueDate = new Date(selectedYear, selectedMonth, dueDay);

        // Only include if the date is valid (handles cases like Feb 30)
        if (
          dueDate.getDate() === dueDay &&
          dueDate.getMonth() === selectedMonth
        ) {
          // Check if this specific due date is within the payment period
          if (!endDate || dueDate <= endDate) {
            // Check if there's an override expense for this liability in this month
            // Match by liability_id and month, or by description pattern as fallback
            const hasOverride = overrideExpenses.some((override) => {
              const overrideDate = new Date(override.expense_date);
              const isSameMonth =
                overrideDate.getMonth() === selectedMonth &&
                overrideDate.getFullYear() === selectedYear;

              if (!isSameMonth) return false;

              // Primary check: match by liability_id
              if (
                override.liability_id &&
                override.liability_id === liability.id
              ) {
                return true;
              }

              // Fallback: match by description pattern
              if (
                override.description &&
                override.description.includes(liability.name) &&
                override.description.includes('(Override)')
              ) {
                return true;
              }

              return false;
            });

            // Skip this liability if an override exists for this month
            if (hasOverride) {
              return;
            }

            const isPaid = isBillPaid(
              liability.id,
              selectedYear,
              selectedMonth
            );
            bills.push({
              type: 'liability',
              id: liability.id,
              name: liability.name,
              amount: liability.amount,
              category: liability.category,
              payment_type: liability.payment_type,
              source: liability.source,
              dueDate,
              isPaid,
              liability: {
                start_date: liability.start_date,
                months_to_pay: liability.months_to_pay,
              },
            });
          }
        }
      });
    }

    // Process recurring expenses
    if (expenses) {
      const activeRecurringExpenses = expenses.filter(
        (e) => e.is_active && e.frequency !== 'one_time' && !e.budget_id // Exclude budget-linked expenses
      );

      // Get all override expenses (one-time expenses with "(Override)" in description)
      const overrideExpenses = expenses.filter(
        (e) =>
          e.frequency === 'one_time' && e.description.includes('(Override)')
      );

      activeRecurringExpenses.forEach((expense) => {
        if (!expense.due_date || !expense.start_date) return;

        const startDate = new Date(expense.start_date);
        startDate.setHours(0, 0, 0, 0);

        // Check if selected month is within payment period
        if (selectedMonthEndDate < startDate) {
          return; // Payment period hasn't started yet
        }

        const dueDay = expense.due_date;
        const dueDate = new Date(selectedYear, selectedMonth, dueDay);

        // Only include if the date is valid
        if (
          dueDate.getDate() === dueDay &&
          dueDate.getMonth() === selectedMonth
        ) {
          // Check if there's an override expense for this recurring expense in this month
          // Override expenses have the pattern: "{expense.description} (Override)"
          const hasOverride = overrideExpenses.some((override) => {
            const overrideDate = new Date(override.expense_date);
            return (
              override.description === `${expense.description} (Override)` &&
              overrideDate.getMonth() === selectedMonth &&
              overrideDate.getFullYear() === selectedYear
            );
          });

          // Skip this recurring expense if an override exists for this month
          if (hasOverride) {
            return;
          }

          bills.push({
            type: 'expense',
            id: expense.id,
            name: expense.description,
            amount: expense.amount,
            category: expense.category || 'Bills',
            dueDate,
            isPaid: expense.is_paid || false,
            frequency: expense.frequency, // Include frequency to distinguish recurring vs one-time
          });
        }
      });
    }

    // Process one-time expenses (excluding overrides - they're handled separately)
    if (expenses) {
      const activeOneTimeExpenses = expenses.filter(
        (e) =>
          e.is_active &&
          e.frequency === 'one_time' &&
          !e.description.includes('(Override)') &&
          !e.budget_id // Exclude budget-linked expenses
      );
      activeOneTimeExpenses.forEach((expense) => {
        if (!expense.expense_date) return;

        const expenseDate = new Date(expense.expense_date);
        expenseDate.setHours(0, 0, 0, 0);

        // Check if this expense falls in the selected month
        if (
          expenseDate.getMonth() === selectedMonth &&
          expenseDate.getFullYear() === selectedYear
        ) {
          bills.push({
            type: 'expense',
            id: expense.id,
            name: expense.description,
            amount: expense.amount,
            category: expense.category || 'Bills',
            dueDate: expenseDate,
            isPaid: expense.is_paid !== undefined ? expense.is_paid : true, // Default to paid for one-time expenses
            frequency: expense.frequency,
          });
        }
      });

      // Process override expenses separately (they replace the original recurring item)
      const overrideExpensesForMonth = expenses.filter(
        (e) =>
          e.is_active &&
          e.frequency === 'one_time' &&
          e.description.includes('(Override)') &&
          !e.budget_id // Exclude budget-linked expenses
      );
      overrideExpensesForMonth.forEach((expense) => {
        if (!expense.expense_date) return;

        const expenseDate = new Date(expense.expense_date);
        expenseDate.setHours(0, 0, 0, 0);

        // Check if this override expense falls in the selected month
        if (
          expenseDate.getMonth() === selectedMonth &&
          expenseDate.getFullYear() === selectedYear
        ) {
          bills.push({
            type: 'expense',
            id: expense.id,
            name: expense.description,
            amount: expense.amount,
            category: expense.category || 'Bills',
            dueDate: expenseDate,
            isPaid: expense.is_paid !== undefined ? expense.is_paid : true,
            frequency: expense.frequency,
          });
        }
      });
    }

    // Process recurring income sources
    if (incomeSources) {
      const activeRecurringIncome = incomeSources.filter(
        (income) => income.is_active && income.frequency !== 'one_time'
      );
      activeRecurringIncome.forEach((income) => {
        // For monthly income, extract the day of month and show it every month on that day
        // but only starting from next_payment_date
        if (income.frequency === 'monthly') {
          let paymentDay: number;
          let startDate: Date;

          // Extract the day of month and start date from next_payment_date or payment_date
          if (income.next_payment_date) {
            const paymentDate = new Date(income.next_payment_date);
            paymentDay = paymentDate.getDate();
            startDate = new Date(paymentDate);
          } else if (income.payment_date) {
            const paymentDate = new Date(income.payment_date);
            paymentDay = paymentDate.getDate();
            startDate = new Date(paymentDate);
          } else {
            return; // No date available
          }

          startDate.setHours(0, 0, 0, 0);

          // Create the due date for the selected month
          const dueDate = new Date(selectedYear, selectedMonth, paymentDay);

          // Check if selected month is on or after the start date
          if (selectedMonthEndDate < startDate) {
            return; // Income hasn't started yet
          }

          // Check if there's a generated one-time income for this recurring income in this month
          const generatedIncome = incomeSources?.find(
            (inc) =>
              inc.parent_income_id === income.id &&
              inc.frequency === 'one_time' &&
              inc.payment_date &&
              (() => {
                const genDate = new Date(inc.payment_date);
                return (
                  genDate.getMonth() === selectedMonth &&
                  genDate.getFullYear() === selectedYear
                );
              })()
          );

          // Only include if the date is valid (handles cases like Feb 30)
          // AND if there's no generated income for this month (generated income will be shown instead)
          if (
            dueDate.getDate() === paymentDay &&
            dueDate.getMonth() === selectedMonth &&
            !generatedIncome
          ) {
            bills.push({
              type: 'income',
              id: income.id,
              name: income.name,
              amount: income.amount,
              category: income.category,
              dueDate,
              isPaid: false, // Income doesn't have paid status
              isReceived: false, // Recurring income is not tracked as received per month
            });
          }
        } else if (income.frequency === 'weekly') {
          // For weekly income, calculate all occurrences in the selected month
          let startDate: Date;

          if (income.next_payment_date) {
            startDate = new Date(income.next_payment_date);
          } else if (income.payment_date) {
            startDate = new Date(income.payment_date);
          } else {
            return; // No date available
          }

          startDate.setHours(0, 0, 0, 0);

          // Find the first occurrence in or before the selected month
          const selectedMonthStart = new Date(selectedYear, selectedMonth, 1);
          const selectedMonthEnd = new Date(selectedYear, selectedMonth + 1, 0);

          // Calculate weeks from start date to selected month
          const weeksDiff = Math.floor(
            (selectedMonthStart.getTime() - startDate.getTime()) /
              (7 * 24 * 60 * 60 * 1000)
          );

          // Find the first week that falls in the selected month
          const currentDate = new Date(startDate);
          currentDate.setDate(currentDate.getDate() + weeksDiff * 7);

          // Generate all weekly occurrences in the selected month
          while (currentDate <= selectedMonthEnd) {
            if (
              currentDate >= selectedMonthStart &&
              currentDate <= selectedMonthEnd
            ) {
              // Check if there's a generated one-time income for this recurring income on this date
              const generatedIncome = incomeSources?.find(
                (inc) =>
                  inc.parent_income_id === income.id &&
                  inc.frequency === 'one_time' &&
                  inc.payment_date &&
                  (() => {
                    const genDate = new Date(inc.payment_date);
                    const currentDateStr = currentDate
                      .toISOString()
                      .split('T')[0];
                    const genDateStr = genDate.toISOString().split('T')[0];
                    return currentDateStr === genDateStr;
                  })()
              );

              // Only add if there's no generated income for this date
              if (!generatedIncome) {
                bills.push({
                  type: 'income',
                  id: `${income.id}-${currentDate.getTime()}`, // Unique ID for each occurrence
                  name: income.name,
                  amount: income.amount,
                  category: income.category,
                  dueDate: new Date(currentDate),
                  isPaid: false,
                  isReceived: false, // Recurring income is not tracked as received per month
                });
              }
            }
            currentDate.setDate(currentDate.getDate() + 7);
          }
        }
      });

      // Process one-time income sources
      const activeOneTimeIncome = incomeSources.filter(
        (income) => income.is_active && income.frequency === 'one_time'
      );
      activeOneTimeIncome.forEach((income) => {
        // Use next_payment_date if not received, payment_date if received
        const paymentDate =
          income.is_received && income.payment_date
            ? new Date(income.payment_date)
            : income.next_payment_date
            ? new Date(income.next_payment_date)
            : null;

        if (!paymentDate) return;

        paymentDate.setHours(0, 0, 0, 0);

        // Check if this income falls in the selected month
        if (
          paymentDate.getMonth() === selectedMonth &&
          paymentDate.getFullYear() === selectedYear
        ) {
          bills.push({
            type: 'income',
            id: income.id,
            name: income.name,
            amount: income.amount,
            category: income.category,
            dueDate: paymentDate,
            isPaid: false, // Income doesn't have paid status
            isReceived: income.is_received || false,
          });
        }
      });
    }

    // Process budgets and their linked expenses
    if (budgets) {
      const activeBudgets = budgets.filter((budget) => budget.is_active);
      activeBudgets.forEach((budget) => {
        if (!budget.budget_date) return;

        const budgetDate = new Date(budget.budget_date);
        budgetDate.setHours(0, 0, 0, 0);

        // Check if this budget falls in the selected month
        if (
          budgetDate.getMonth() === selectedMonth &&
          budgetDate.getFullYear() === selectedYear
        ) {
          // Get expenses linked to this budget that fall in the selected month
          const budgetExpenses =
            expenses?.filter((expense) => {
              if (expense.budget_id !== budget.id || !expense.is_active)
                return false;

              const expenseDate = new Date(expense.expense_date);
              expenseDate.setHours(0, 0, 0, 0);

              return (
                expenseDate.getMonth() === selectedMonth &&
                expenseDate.getFullYear() === selectedYear
              );
            }) || [];

          bills.push({
            type: 'budget',
            id: budget.id,
            name: budget.name,
            amount: budget.amount,
            category: 'Budget',
            dueDate: budgetDate,
            isPaid: false, // Budgets are never "paid" - they're containers, not strikethrough
            budgetExpenses: budgetExpenses.map((expense) => ({
              type: 'expense' as const,
              id: expense.id,
              name: expense.description,
              amount: expense.amount,
              category: expense.category || 'Bills',
              dueDate: new Date(expense.expense_date),
              isPaid: expense.is_paid || false,
              frequency: expense.frequency,
            })),
          });
        }
      });
    }

    // Sort by due date
    const sortedBills = bills.sort(
      (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
    );

    // Apply category filters if any are selected
    let filteredBills = sortedBills;
    if (selectedFilters.length > 0) {
      filteredBills = sortedBills.filter((bill) => {
        const filterGroup = getBillFilterGroup(bill);
        return selectedFilters.includes(filterGroup);
      });
    }

    // Apply paid/unpaid filter
    if (paidFilter === 'paid') {
      filteredBills = filteredBills.filter((bill) => {
        if (bill.type === 'income') {
          return bill.isReceived || false;
        }
        return bill.isPaid;
      });
    } else if (paidFilter === 'unpaid') {
      filteredBills = filteredBills.filter((bill) => {
        if (bill.type === 'income') {
          return !bill.isReceived;
        }
        return !bill.isPaid;
      });
    } else if (paidFilter === 'unchecked') {
      // Unchecked = items that haven't been checked yet (not paid/received)
      filteredBills = filteredBills.filter((bill) => {
        if (bill.type === 'income') {
          return !bill.isReceived;
        }
        return !bill.isPaid;
      });
    }

    return filteredBills;
  }, [
    liabilities,
    expenses,
    budgets,
    incomeSources,
    selectedMonth,
    selectedYear,
    selectedFilters,
    paidFilter,
    isBillPaid,
  ]);

  // Calculate separate totals for income and expenses/bills
  // Total Income = unreceived income
  const totalIncome = useMemo(() => {
    return billsForMonth
      .filter((bill) => bill.type === 'income' && !bill.isReceived)
      .reduce((sum, bill) => sum + bill.amount, 0);
  }, [billsForMonth]);

  const totalBills = useMemo(() => {
    return billsForMonth
      .filter((bill) => {
        // Only count expenses/bills (not income)
        if (bill.type === 'income') return false;

        // When filter is 'paid' or 'unpaid', include all (filtering is already done in billsForMonth)
        return true;
      })
      .reduce((sum, bill) => sum + bill.amount, 0);
  }, [billsForMonth]);

  // Calculate remaining bills (unpaid liabilities and expenses for the month)
  const remainingBills = useMemo(() => {
    return billsForMonth
      .filter((bill) => {
        // Only liabilities and expenses (not income, not budgets)
        if (bill.type === 'income') return false;
        if (bill.type === 'budget') return false; // Budgets are not bills
        // Only unpaid
        return !bill.isPaid;
      })
      .reduce((sum, bill) => sum + bill.amount, 0);
  }, [billsForMonth]);

  // Calculate income received for the month (all received income from billsForMonth)
  const incomeReceived = useMemo(() => {
    return billsForMonth
      .filter((bill) => bill.type === 'income' && bill.isReceived)
      .reduce((sum, bill) => sum + bill.amount, 0);
  }, [billsForMonth]);

  // Calculate expenses for the month (one-time expenses)
  const expensesForMonth = useMemo(() => {
    if (!expenses) return 0;
    const selectedMonthStart = new Date(selectedYear, selectedMonth, 1);
    const selectedMonthEnd = new Date(selectedYear, selectedMonth + 1, 0);

    return expenses
      .filter((expense) => {
        // Only one-time expenses
        if (expense.frequency !== 'one_time') return false;
        if (!expense.expense_date) return false;

        const expenseDate = new Date(expense.expense_date);
        return (
          expenseDate >= selectedMonthStart && expenseDate <= selectedMonthEnd
        );
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses, selectedYear, selectedMonth]);

  // Calculate remaining money (income received - expenses for the month)
  const remainingMoney = useMemo(() => {
    return incomeReceived - expensesForMonth;
  }, [incomeReceived, expensesForMonth]);

  // Calculate expected remaining cash (total income - total bills)
  const expectedRemainingCash = useMemo(() => {
    return totalIncome - totalBills;
  }, [totalIncome, totalBills]);

  // Group bills by due date
  const billsByDate = useMemo(() => {
    const grouped: Record<number, typeof billsForMonth> = {};

    billsForMonth.forEach((bill) => {
      const day = bill.dueDate.getDate();
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(bill);
    });

    return grouped;
  }, [billsForMonth]);

  // Navigation functions
  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
  };

  const getCategoryColor = (
    billType: 'liability' | 'expense' | 'income' | 'budget',
    category: string,
    paymentType?: 'straight' | 'installment' | null
  ): string => {
    if (billType === 'income') {
      return 'green';
    }
    if (billType === 'budget') {
      return 'blue';
    }
    switch (category) {
      case 'credit_card':
        return paymentType === 'installment' ? 'orange' : 'blue';
      case 'loan':
        return 'purple';
      default:
        return 'default';
    }
  };

  // Helper function to calculate payment number for installments
  const getPaymentNumber = (
    startDate: Date,
    monthsToPay: number | null,
    currentYear: number,
    currentMonth: number
  ): string | null => {
    if (!monthsToPay || monthsToPay <= 1) return null;

    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();

    // Calculate month difference
    const monthDiff =
      (currentYear - startYear) * 12 + (currentMonth - startMonth);

    // Payment number (1-indexed)
    const paymentNumber = monthDiff + 1;

    // Only show if within payment period
    if (paymentNumber >= 1 && paymentNumber <= monthsToPay) {
      return `${paymentNumber}/${monthsToPay}`;
    }

    return null;
  };

  const getCategoryLabel = (
    billType: 'liability' | 'expense' | 'income' | 'budget',
    category: string,
    paymentType?: 'straight' | 'installment' | null,
    liability?: { start_date: string | null; months_to_pay: number | null },
    currentYear?: number,
    currentMonth?: number
  ) => {
    if (billType === 'budget') {
      return 'Budget';
    }
    if (billType === 'income') {
      // Capitalize first letter of category
      return category.charAt(0).toUpperCase() + category.slice(1);
    }
    switch (category) {
      case 'credit_card':
        if (
          paymentType === 'installment' &&
          liability &&
          currentYear !== undefined &&
          currentMonth !== undefined
        ) {
          const startDate = liability.start_date
            ? new Date(liability.start_date)
            : null;
          if (startDate) {
            const paymentCounter = getPaymentNumber(
              startDate,
              liability.months_to_pay,
              currentYear,
              currentMonth
            );
            return paymentCounter
              ? `CC - Installment ${paymentCounter}`
              : 'CC - Installment';
          }
          return 'CC - Installment';
        }
        return 'CC';
      case 'loan':
        if (
          liability &&
          currentYear !== undefined &&
          currentMonth !== undefined
        ) {
          const startDate = liability.start_date
            ? new Date(liability.start_date)
            : null;
          if (startDate) {
            const paymentCounter = getPaymentNumber(
              startDate,
              liability.months_to_pay,
              currentYear,
              currentMonth
            );
            return paymentCounter ? `Loan ${paymentCounter}` : 'Loan';
          }
        }
        return 'Loan';
      default:
        return 'Other';
    }
  };

  // Calculate bills for all months (for list view)
  const billsByMonth = useMemo(() => {
    if (viewMode !== 'list') return {};

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Get bills for next 12 months
    const monthsData: Record<
      string,
      Array<{
        type: 'liability' | 'expense' | 'income' | 'budget';
        id: string;
        name: string;
        amount: number;
        category: string;
        payment_type?: 'straight' | 'installment' | null;
        source?: string | null;
        dueDate: Date;
        isPaid: boolean;
        isReceived?: boolean; // For income: whether it has been received
        frequency?: 'monthly' | 'weekly' | 'one_time'; // For expenses: frequency type
        liability?: { start_date: string | null; months_to_pay: number | null }; // For payment counter
        budgetExpenses?: Array<{
          // For budgets: nested expenses
          type: 'expense';
          id: string;
          name: string;
          amount: number;
          category: string;
          dueDate: Date;
          isPaid: boolean;
          frequency?: 'monthly' | 'weekly' | 'one_time';
        }>;
      }>
    > = {};

    for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
      const targetMonth = (currentMonth + monthOffset) % 12;
      const targetYear =
        currentYear + Math.floor((currentMonth + monthOffset) / 12);
      const monthKey = `${targetYear}-${targetMonth}`;
      monthsData[monthKey] = [];

      const monthStart = new Date(targetYear, targetMonth, 1);
      const monthEnd = new Date(targetYear, targetMonth + 1, 0);

      // Process liabilities
      if (liabilities) {
        const activeLiabilities = liabilities.filter((l) => l.is_active);
        activeLiabilities.forEach((liability) => {
          // Check if liability is within payment period
          const startDate = liability.start_date
            ? new Date(liability.start_date)
            : new Date(liability.created_at);
          startDate.setHours(0, 0, 0, 0);

          let endDate: Date | null = null;
          if (liability.months_to_pay !== null && liability.months_to_pay > 0) {
            endDate = new Date(startDate);
            // If months_to_pay = 1, end date should be the last day of the start month
            // For months_to_pay > 1, end date is the last day of the (months_to_pay - 1)th month after start
            if (liability.months_to_pay === 1) {
              // Set to last day of the start month
              endDate = new Date(
                startDate.getFullYear(),
                startDate.getMonth() + 1,
                0
              );
            } else {
              // For months_to_pay > 1, set to last day of the (months_to_pay - 1)th month
              endDate.setMonth(
                endDate.getMonth() + liability.months_to_pay - 1
              );
              endDate = new Date(
                endDate.getFullYear(),
                endDate.getMonth() + 1,
                0
              );
            }
            endDate.setHours(23, 59, 59, 999);
          }

          // Check if month is within payment period
          if (endDate && monthStart > endDate) {
            return; // Payment period has ended
          }
          if (monthEnd < startDate) {
            return; // Payment period hasn't started yet
          }

          const dueDay = liability.due_date;
          const dueDate = new Date(targetYear, targetMonth, dueDay);

          // Only include if the date is valid
          if (
            dueDate.getDate() === dueDay &&
            dueDate.getMonth() === targetMonth
          ) {
            // Check if this specific due date is within the payment period
            if (!endDate || dueDate <= endDate) {
              const isPaid = isBillPaid(liability.id, targetYear, targetMonth);
              monthsData[monthKey].push({
                type: 'liability',
                id: liability.id,
                name: liability.name,
                amount: liability.amount,
                category: liability.category,
                payment_type: liability.payment_type,
                source: liability.source,
                dueDate,
                isPaid,
                liability: {
                  start_date: liability.start_date,
                  months_to_pay: liability.months_to_pay,
                },
              });
            }
          }
        });
      }

      // Process recurring expenses
      if (expenses) {
        const activeRecurringExpenses = expenses.filter(
          (e) => e.is_active && e.frequency !== 'one_time'
        );
        activeRecurringExpenses.forEach((expense) => {
          if (!expense.due_date || !expense.start_date) return;

          const startDate = new Date(expense.start_date);
          startDate.setHours(0, 0, 0, 0);

          // Check if month is within payment period
          if (monthEnd < startDate) {
            return; // Payment period hasn't started yet
          }

          const dueDay = expense.due_date;
          const dueDate = new Date(targetYear, targetMonth, dueDay);

          // Only include if the date is valid
          if (
            dueDate.getDate() === dueDay &&
            dueDate.getMonth() === targetMonth
          ) {
            monthsData[monthKey].push({
              type: 'expense',
              id: expense.id,
              name: expense.description,
              amount: expense.amount,
              category: expense.category || 'Bills',
              dueDate,
              isPaid: expense.is_paid || false,
              frequency: expense.frequency,
            });
          }
        });
      }

      // Process one-time expenses (excluding overrides and budget-linked expenses - they're handled separately)
      if (expenses) {
        const activeOneTimeExpenses = expenses.filter(
          (e) =>
            e.is_active &&
            e.frequency === 'one_time' &&
            !e.description.includes('(Override)') &&
            !e.budget_id // Exclude budget-linked expenses (they're shown under budgets)
        );
        activeOneTimeExpenses.forEach((expense) => {
          if (!expense.expense_date) return;

          const expenseDate = new Date(expense.expense_date);
          expenseDate.setHours(0, 0, 0, 0);

          // Determine which month this expense belongs to
          const expenseYear = expenseDate.getFullYear();
          const expenseMonth = expenseDate.getMonth();
          const monthKey = `${expenseYear}-${expenseMonth}`;

          // Initialize month if it doesn't exist
          if (!monthsData[monthKey]) {
            monthsData[monthKey] = [];
          }

          // Add the expense to the appropriate month
          monthsData[monthKey].push({
            type: 'expense',
            id: expense.id,
            name: expense.description,
            amount: expense.amount,
            category: expense.category || 'Bills',
            dueDate: expenseDate,
            isPaid: expense.is_paid !== undefined ? expense.is_paid : true, // Default to paid for one-time expenses
            frequency: expense.frequency,
          });
        });
      }

      // Process recurring income sources
      if (incomeSources) {
        const activeRecurringIncome = incomeSources.filter(
          (income) => income.is_active && income.frequency !== 'one_time'
        );
        activeRecurringIncome.forEach((income) => {
          if (income.frequency === 'monthly') {
            let paymentDay: number;
            let startDate: Date;

            // Extract the day of month and start date from next_payment_date or payment_date
            if (income.next_payment_date) {
              const paymentDate = new Date(income.next_payment_date);
              paymentDay = paymentDate.getDate();
              startDate = new Date(paymentDate);
            } else if (income.payment_date) {
              const paymentDate = new Date(income.payment_date);
              paymentDay = paymentDate.getDate();
              startDate = new Date(paymentDate);
            } else {
              return; // No date available
            }

            startDate.setHours(0, 0, 0, 0);

            // Create the due date for the target month
            const dueDate = new Date(targetYear, targetMonth, paymentDay);
            const targetMonthEndDate = new Date(targetYear, targetMonth + 1, 0);
            targetMonthEndDate.setHours(23, 59, 59, 999);

            // Check if target month is on or after the start date
            if (targetMonthEndDate < startDate) {
              return; // Income hasn't started yet
            }

            // Check if there's a generated one-time income for this recurring income in this month
            const generatedIncome = incomeSources?.find(
              (inc) =>
                inc.parent_income_id === income.id &&
                inc.frequency === 'one_time' &&
                inc.payment_date &&
                (() => {
                  const genDate = new Date(inc.payment_date);
                  return (
                    genDate.getMonth() === targetMonth &&
                    genDate.getFullYear() === targetYear
                  );
                })()
            );

            // Only include if the date is valid (handles cases like Feb 30)
            // AND if there's no generated income for this month (generated income will be shown instead)
            if (
              dueDate.getDate() === paymentDay &&
              dueDate.getMonth() === targetMonth &&
              !generatedIncome
            ) {
              monthsData[monthKey].push({
                type: 'income',
                id: income.id,
                name: income.name,
                amount: income.amount,
                category: income.category,
                dueDate,
                isPaid: false,
                isReceived: false, // Recurring income is not tracked as received per month
              });
            }
          } else if (income.frequency === 'weekly') {
            // For weekly income, calculate all occurrences in the target month
            let startDate: Date;

            if (income.next_payment_date) {
              startDate = new Date(income.next_payment_date);
            } else if (income.payment_date) {
              startDate = new Date(income.payment_date);
            } else {
              return; // No date available
            }

            startDate.setHours(0, 0, 0, 0);

            // Calculate weeks from start date to target month
            const weeksDiff = Math.floor(
              (monthStart.getTime() - startDate.getTime()) /
                (7 * 24 * 60 * 60 * 1000)
            );

            // Find the first week that falls in the target month
            const currentDate = new Date(startDate);
            currentDate.setDate(currentDate.getDate() + weeksDiff * 7);

            // Generate all weekly occurrences in the target month
            while (currentDate <= monthEnd) {
              if (currentDate >= monthStart && currentDate <= monthEnd) {
                // Check if there's a generated one-time income for this recurring income on this date
                const generatedIncome = incomeSources?.find(
                  (inc) =>
                    inc.parent_income_id === income.id &&
                    inc.frequency === 'one_time' &&
                    inc.payment_date &&
                    (() => {
                      const genDate = new Date(inc.payment_date);
                      const currentDateStr = currentDate
                        .toISOString()
                        .split('T')[0];
                      const genDateStr = genDate.toISOString().split('T')[0];
                      return currentDateStr === genDateStr;
                    })()
                );

                // Only add if there's no generated income for this date
                if (!generatedIncome) {
                  monthsData[monthKey].push({
                    type: 'income',
                    id: `${income.id}-${currentDate.getTime()}`,
                    name: income.name,
                    amount: income.amount,
                    category: income.category,
                    dueDate: new Date(currentDate),
                    isPaid: false,
                    isReceived: false, // Recurring income is not tracked as received per month
                  });
                }
              }
              currentDate.setDate(currentDate.getDate() + 7);
            }
          }
        });

        // Process one-time income sources
        const activeOneTimeIncome = incomeSources.filter(
          (income) => income.is_active && income.frequency === 'one_time'
        );
        activeOneTimeIncome.forEach((income) => {
          // Use next_payment_date if not received, payment_date if received
          const paymentDate =
            income.is_received && income.payment_date
              ? new Date(income.payment_date)
              : income.next_payment_date
              ? new Date(income.next_payment_date)
              : null;

          if (!paymentDate) return;

          paymentDate.setHours(0, 0, 0, 0);

          // Check if this income falls in the target month
          if (
            paymentDate.getMonth() === targetMonth &&
            paymentDate.getFullYear() === targetYear
          ) {
            monthsData[monthKey].push({
              type: 'income',
              id: income.id,
              name: income.name,
              amount: income.amount,
              category: income.category,
              dueDate: paymentDate,
              isPaid: false,
              isReceived: income.is_received || false,
            });
          }
        });
      }

      // Process budgets and their linked expenses
      if (budgets) {
        const activeBudgets = budgets.filter((budget) => budget.is_active);
        activeBudgets.forEach((budget) => {
          if (!budget.budget_date) return;

          const budgetDate = new Date(budget.budget_date);
          budgetDate.setHours(0, 0, 0, 0);

          // Check if this budget falls in the target month
          if (
            budgetDate.getMonth() === targetMonth &&
            budgetDate.getFullYear() === targetYear
          ) {
            // Get expenses linked to this budget that fall in the target month
            const budgetExpenses =
              expenses?.filter((expense) => {
                if (expense.budget_id !== budget.id || !expense.is_active)
                  return false;

                const expenseDate = new Date(expense.expense_date);
                expenseDate.setHours(0, 0, 0, 0);

                return (
                  expenseDate.getMonth() === targetMonth &&
                  expenseDate.getFullYear() === targetYear
                );
              }) || [];

            monthsData[monthKey].push({
              type: 'budget',
              id: budget.id,
              name: budget.name,
              amount: budget.amount,
              category: 'Budget',
              dueDate: budgetDate,
              isPaid: false, // Budgets are never "paid" - they're containers, not strikethrough
              budgetExpenses: budgetExpenses.map((expense) => ({
                type: 'expense' as const,
                id: expense.id,
                name: expense.description,
                amount: expense.amount,
                category: expense.category || 'Bills',
                dueDate: new Date(expense.expense_date),
                isPaid: expense.is_paid || false,
                frequency: expense.frequency,
              })),
            });
          }
        });
      }

      // Sort by due date
      monthsData[monthKey].sort(
        (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
      );

      // Apply category filters if any are selected
      if (selectedFilters.length > 0) {
        monthsData[monthKey] = monthsData[monthKey].filter((bill) => {
          const filterGroup = getBillFilterGroup(bill);
          return selectedFilters.includes(filterGroup);
        });
      }

      // Apply paid/unpaid filter
      if (paidFilter === 'paid') {
        monthsData[monthKey] = monthsData[monthKey].filter((bill) => {
          if (bill.type === 'income') {
            return bill.isReceived || false;
          }
          return bill.isPaid;
        });
      } else if (paidFilter === 'unpaid') {
        monthsData[monthKey] = monthsData[monthKey].filter((bill) => {
          if (bill.type === 'income') {
            return !bill.isReceived;
          }
          return !bill.isPaid;
        });
      } else if (paidFilter === 'unchecked') {
        // Unchecked = items that haven't been checked yet (not paid/received)
        monthsData[monthKey] = monthsData[monthKey].filter((bill) => {
          if (bill.type === 'income') {
            return !bill.isReceived;
          }
          return !bill.isPaid;
        });
      }
    }

    return monthsData;
  }, [
    liabilities,
    expenses,
    incomeSources,
    budgets,
    viewMode,
    selectedFilters,
    paidFilter,
    isBillPaid,
  ]);

  if (isLoading) {
    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={2}>Cash Flow</Title>
        <Card>
          <Skeleton active paragraph={{ rows: 3 }} />
        </Card>
      </Space>
    );
  }

  const filterOptions: Array<{ value: FilterGroup; label: string }> = [
    { value: 'income', label: 'Income' },
    { value: 'recurring_expenses', label: 'Recurring Expenses' },
    { value: 'credit_cards', label: 'Credit Cards' },
    { value: 'loans', label: 'Loans' },
    { value: 'installments', label: 'Installments' },
    { value: 'budget', label: 'Budgets' },
    { value: 'other', label: 'Other' },
  ];

  const handleFilterToggle = (filter: FilterGroup) => {
    setSelectedFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  };

  const filterMenuItems: MenuProps['items'] = [
    ...filterOptions.map((option) => ({
      key: option.value,
      label: (
        <Checkbox
          checked={selectedFilters.includes(option.value)}
          onChange={() => handleFilterToggle(option.value)}
          onClick={(e) => e.stopPropagation()}
        >
          {option.label}
        </Checkbox>
      ),
    })),
    ...(selectedFilters.length > 0
      ? [
          {
            type: 'divider' as const,
          },
          {
            key: 'clear-all',
            label: (
              <Button
                type="link"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFilters([]);
                }}
                style={{ padding: 0 }}
              >
                Clear all filters
              </Button>
            ),
          },
        ]
      : []),
  ];

  // Handle marking a bill as paid
  const handleTogglePaid = (
    bill: {
      type: 'liability' | 'expense' | 'income' | 'budget';
      id: string;
      name: string;
      amount: number;
      isPaid: boolean;
    },
    year: number,
    month: number
  ) => {
    // Budgets don't need to be toggled - they're always "paid"
    if (bill.type === 'budget') return;
    // Only liabilities can be marked as paid (expenses and income are tracked differently)
    if (bill.type !== 'liability') return;

    // Don't allow unchecking - bills can't be unpaid once marked as paid
    if (bill.isPaid) {
      return;
    }

    // Show confirmation dialog before marking as paid
    setPendingBill({ bill, year, month });
  };

  // Confirm marking bill as paid
  const handleConfirmPaid = async () => {
    if (!pendingBill) return;

    try {
      const values = await billForm.validateFields();
      const { bill } = pendingBill;
      const actualAmount =
        values.overrideAmount !== undefined && values.overrideAmount !== null
          ? values.overrideAmount
          : bill.amount;

      // Create an expense to mark this as paid
      // Use today's date, not the first of the month
      const today = new Date();
      const expenseDateStr = today.toISOString().split('T')[0];

      await createExpenseAsync({
        description: bill.name,
        amount: actualAmount, // Use override amount if provided
        category: 'Bills',
        expense_date: expenseDateStr,
        frequency: 'one_time',
        liability_id: bill.id, // Link expense to the liability
      });
      message.success('Bill marked as paid successfully');
      // Close the confirmation dialog after successful creation
      setPendingBill(null);
      billForm.resetFields();
    } catch (error) {
      // Form validation error - don't show error message
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      console.error('Error creating expense:', error);
      message.error('Failed to mark bill as paid. Please try again.');
    }
  };

  // Handle marking expense as paid
  const handleMarkExpensePaid = (
    bill: {
      type: 'liability' | 'expense' | 'income' | 'budget';
      id: string;
      name: string;
      amount: number;
      frequency?: 'monthly' | 'weekly' | 'one_time';
    },
    year: number,
    month: number
  ) => {
    // Budgets don't need to be marked as paid - they're always "paid"
    if (bill.type === 'budget') return;
    // For one-time expenses, mark as paid directly
    if (bill.frequency === 'one_time') {
      updateExpense(
        {
          id: bill.id,
          updates: { is_paid: true },
        },
        {
          onSuccess: () => {
            message.success('Expense marked as paid successfully');
          },
          onError: (error: Error) => {
            message.error(
              'Error marking expense as paid: ' +
                (error instanceof Error ? error.message : 'Unknown error')
            );
          },
        }
      );
    } else {
      // For recurring expenses, show modal to allow amount override
      setPendingExpense({
        expense: {
          id: bill.id,
          name: bill.name,
          amount: bill.amount,
          frequency: bill.frequency as 'monthly' | 'weekly',
        },
        year,
        month,
      });
    }
  };

  // Confirm marking recurring expense as paid (with optional amount override)
  const handleConfirmExpensePaid = async () => {
    if (!pendingExpense) return;

    try {
      const values = await expenseForm.validateFields();
      const { expense } = pendingExpense;
      const actualAmount =
        values.overrideAmount !== undefined && values.overrideAmount !== null
          ? values.overrideAmount
          : expense.amount;

      updateExpense(
        {
          id: expense.id,
          updates: {
            is_paid: true,
            amount: actualAmount, // Update with actual amount paid
          },
        },
        {
          onSuccess: () => {
            message.success('Expense marked as paid successfully');
            setPendingExpense(null);
            expenseForm.resetFields();
          },
          onError: (error: Error) => {
            message.error(
              'Error marking expense as paid: ' +
                (error instanceof Error ? error.message : 'Unknown error')
            );
          },
        }
      );
    } catch (error) {
      // Form validation error - don't show error message
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      console.error('Error marking expense as paid:', error);
    }
  };

  const handleCancelExpensePaid = () => {
    setPendingExpense(null);
    expenseForm.resetFields();
  };

  // Handle opening edit override modal for recurring expense
  const handleEditExpenseOverride = (
    bill: {
      type: 'liability' | 'expense' | 'income' | 'budget';
      id: string;
      name: string;
      amount: number;
      category?: string;
      frequency?: 'monthly' | 'weekly' | 'one_time';
    },
    year: number,
    month: number
  ) => {
    if (bill.type !== 'expense' || bill.frequency === 'one_time') return;

    setEditingExpenseOverride({
      expense: {
        id: bill.id,
        name: bill.name,
        amount: bill.amount,
        category: bill.category || null,
        frequency: bill.frequency as 'monthly' | 'weekly',
      },
      year,
      month,
    });
  };

  // Confirm creating expense override
  const handleConfirmExpenseOverride = async (skipMonth: boolean = false) => {
    if (!editingExpenseOverride) return;

    try {
      const { expense } = editingExpenseOverride;

      // For skip, use $0 and today's date
      let amount = 0;
      let expenseDate: string;

      if (skipMonth) {
        expenseDate = new Date().toISOString().split('T')[0];
      } else {
        const values = await expenseOverrideForm.validateFields();
        amount = values.amount;
        expenseDate = (values.expense_date as Dayjs).format('YYYY-MM-DD');
      }

      // Create a one-time expense linked to the recurring expense
      // Use a special description pattern to identify it as an override
      await createExpenseAsync({
        description: `${expense.name} (Override)`,
        amount,
        category: expense.category,
        expense_date: expenseDate,
        frequency: 'one_time',
        is_active: true,
        is_paid: skipMonth ? true : false, // Skip expenses are marked as paid (since $0)
        // Store parent expense ID in description for now (we can add a proper field later)
        // The description pattern will help us identify and hide the recurring expense
      });

      message.success(
        skipMonth
          ? 'Expense skipped for this month'
          : 'Expense override created successfully'
      );
      setEditingExpenseOverride(null);
      expenseOverrideForm.resetFields();
    } catch (error) {
      // Form validation error - don't show error message
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      console.error('Error creating expense override:', error);
      message.error('Failed to create expense override. Please try again.');
    }
  };

  const handleCancelExpenseOverride = () => {
    setEditingExpenseOverride(null);
    expenseOverrideForm.resetFields();
  };

  // Handle opening edit override modal for liability
  const handleEditLiabilityOverride = (
    bill: {
      type: 'liability' | 'expense' | 'income' | 'budget';
      id: string;
      name: string;
      amount: number;
      isPaid?: boolean;
    },
    year: number,
    month: number
  ) => {
    if (bill.type !== 'liability' || bill.isPaid) return;

    setEditingLiabilityOverride({
      liability: {
        id: bill.id,
        name: bill.name,
        amount: bill.amount,
      },
      year,
      month,
    });
    // Set form initial values
    liabilityOverrideForm.setFieldsValue({
      amount: bill.amount,
      expense_date: dayjs(new Date(year, month, 1)),
    });
  };

  // Confirm creating liability override
  const handleConfirmLiabilityOverride = async (skipMonth: boolean = false) => {
    if (!editingLiabilityOverride) return;

    try {
      const { liability } = editingLiabilityOverride;

      // For skip, use $0 and today's date
      let amount = 0;
      let expenseDate: string;

      if (skipMonth) {
        expenseDate = new Date().toISOString().split('T')[0];
      } else {
        const values = await liabilityOverrideForm.validateFields();
        amount = values.amount;
        expenseDate = (values.expense_date as Dayjs).format('YYYY-MM-DD');
      }

      // Create a one-time expense linked to the liability
      // Use a special description pattern to identify it as an override
      await createExpenseAsync({
        description: `${liability.name} (Override)`,
        amount,
        category: 'Bills',
        expense_date: expenseDate,
        frequency: 'one_time',
        is_active: true,
        is_paid: skipMonth ? true : false, // Skip expenses are marked as paid (since $0)
        liability_id: liability.id, // Link to the liability
      });

      message.success(
        skipMonth
          ? 'Liability skipped for this month'
          : 'Liability override created successfully'
      );
      setEditingLiabilityOverride(null);
      liabilityOverrideForm.resetFields();
    } catch (error) {
      // Form validation error - don't show error message
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return;
      }
      console.error('Error creating liability override:', error);
      message.error('Failed to create liability override. Please try again.');
    }
  };

  const handleCancelLiabilityOverride = () => {
    setEditingLiabilityOverride(null);
    liabilityOverrideForm.resetFields();
  };

  // Handle creating expense for a budget
  const handleSubmitBudgetExpense = async () => {
    if (!selectedBudgetForExpense) return;

    try {
      const values = await budgetExpenseForm.validateFields();
      const expenses = values.expenses || [];
      const budgetId = values.budget_id;

      if (expenses.length === 0) {
        message.error('Please add at least one expense');
        return;
      }

      // Filter out empty expenses
      const validExpenses = expenses.filter(
        (exp: { description: string; amount: number | undefined }) =>
          exp.description &&
          exp.description.trim() &&
          exp.amount &&
          exp.amount > 0
      );

      if (validExpenses.length === 0) {
        message.error('Please enter at least one valid expense');
        return;
      }

      // Create all expenses
      const today = new Date().toISOString().split('T')[0];
      const promises = validExpenses.map(
        (exp: { description: string; amount: number }) =>
          createExpenseAsync({
            description: exp.description.trim(),
            amount: exp.amount,
            category: 'Other', // Default to "Other"
            expense_date: today, // Default to today
            frequency: 'one_time',
            due_date: null,
            start_date: null,
            budget_id: budgetId,
            is_active: true,
            is_paid: false, // Default to unpaid
          })
      );

      // Wait for all expenses to be created
      await Promise.all(promises);
      message.success(
        `Successfully created ${validExpenses.length} expense${
          validExpenses.length > 1 ? 's' : ''
        }`
      );
      setSelectedBudgetForExpense(null);
      budgetExpenseForm.resetFields();
    } catch (error) {
      // Form validation errors are handled by Ant Design
      if (error instanceof Error && !error.message.includes('validation')) {
        message.error('Error creating expense: ' + error.message);
      }
    }
  };

  // Handle marking income as received
  const handleMarkIncomeReceived = (
    income: {
      id: string;
      name: string;
      amount: number;
      frequency?: 'monthly' | 'weekly' | 'one_time';
      category?: 'salary' | 'project' | 'other';
    },
    year: number,
    month: number
  ) => {
    // Show confirmation dialog before marking as received
    setPendingIncome({ income, year, month });
  };

  // Confirm marking income as received
  const handleConfirmIncomeReceived = async () => {
    if (!pendingIncome) return;

    const { income } = pendingIncome;

    // Use today's date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    try {
      // Check if it's monthly/weekly (recurring) or one-time
      if (income.frequency === 'monthly' || income.frequency === 'weekly') {
        // For recurring income: create a new one-time income with received = true
        // Link it to the parent income and add identifier in the name
        await createIncomeSourceAsync({
          name: `Generated from ${income.name}`,
          amount: income.amount,
          frequency: 'one_time',
          category: income.category || 'other',
          is_received: true,
          payment_date: todayStr,
          next_payment_date: todayStr,
          parent_income_id: income.id, // Link to parent recurring income
        });
      } else {
        // For one-time income: just mark it as received
        await updateIncomeSourceAsync({
          id: income.id,
          updates: {
            is_received: true,
            payment_date: todayStr,
            next_payment_date: todayStr,
          },
        });
      }
      message.success('Income marked as received successfully');
      // Close the confirmation dialog after successful update
      setPendingIncome(null);
    } catch (error) {
      console.error('Error updating income:', error);
      message.error('Failed to mark income as received. Please try again.');
    }
  };

  // Cancel marking income as received
  const handleCancelIncomeReceived = () => {
    setPendingIncome(null);
  };

  // Cancel marking bill as paid
  const handleCancelPaid = () => {
    setPendingBill(null);
    billForm.resetFields();
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Cash Flow
        </Title>
        <Space wrap>
          {/* Filter Dropdown */}
          <Dropdown
            menu={{
              items: filterMenuItems,
              onSelect: ({ key }) => handleFilterToggle(key as FilterGroup),
            }}
            trigger={['click']}
          >
            <Button icon={<FilterOutlined />}>
              Filter
              {selectedFilters.length > 0 && (
                <Badge
                  count={selectedFilters.length}
                  style={{ marginLeft: 8 }}
                />
              )}
            </Button>
          </Dropdown>
          {/* Paid/Unpaid Filter */}
          <Select
            value={paidFilter}
            onChange={(value) =>
              setPaidFilter(value as 'all' | 'paid' | 'unpaid' | 'unchecked')
            }
            style={{ width: 140 }}
          >
            <Option value="all">All Bills</Option>
            <Option value="paid">Paid</Option>
            <Option value="unpaid">Unpaid</Option>
            <Option value="unchecked">Unchecked</Option>
          </Select>
          {/* View Mode Toggle */}
          <Segmented
            options={[
              {
                label: 'Calendar',
                value: 'calendar',
                icon: <CalendarOutlined />,
              },
              { label: 'List', value: 'list', icon: <UnorderedListOutlined /> },
            ]}
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
          />
        </Space>
      </div>

      {/* Active Filters Display */}
      {selectedFilters.length > 0 && (
        <Alert
          message={
            <Space wrap>
              <Text strong>Active filters:</Text>
              {selectedFilters.map((filter) => {
                const option = filterOptions.find((o) => o.value === filter);
                return (
                  <Tag
                    key={filter}
                    closable
                    onClose={() => handleFilterToggle(filter)}
                    color="blue"
                  >
                    {option?.label}
                  </Tag>
                );
              })}
              <Button
                type="link"
                size="small"
                onClick={() => setSelectedFilters([])}
                style={{ padding: 0 }}
              >
                Clear all
              </Button>
            </Space>
          }
          type="info"
          showIcon
        />
      )}

      {viewMode === 'calendar' ? (
        <>
          {/* Month Selector */}
          <Card>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Button icon={<LeftOutlined />} onClick={goToPreviousMonth} />
              <Space>
                <Title level={4} style={{ margin: 0 }}>
                  {monthNames[selectedMonth]} {selectedYear}
                </Title>
                <Button type="link" onClick={goToCurrentMonth}>
                  Today
                </Button>
              </Space>
              <Button icon={<RightOutlined />} onClick={goToNextMonth} />
            </div>
          </Card>

          {/* Summary Card */}
          <Card title="Summary">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Statistic
                  title="Total Bills"
                  value={formatCurrency(totalBills)}
                  valueStyle={{ color: '#dc2626' }}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Statistic
                  title="Receivable Income"
                  value={formatCurrency(totalIncome)}
                  valueStyle={{ color: '#16a34a' }}
                />
                <Text
                  type="secondary"
                  style={{ fontSize: '12px', display: 'block', marginTop: 4 }}
                >
                  Expected Remaining Cash{' '}
                  {formatCurrency(expectedRemainingCash)}
                </Text>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Statistic
                  title="Remaining Funds for the month"
                  value={formatCurrency(remainingMoney)}
                  valueStyle={{
                    color: remainingMoney >= 0 ? '#16a34a' : '#dc2626',
                  }}
                />
                <Text
                  type="secondary"
                  style={{ fontSize: '12px', display: 'block', marginTop: 4 }}
                >
                  Total bills - Received income
                </Text>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Statistic
                  title="Unpaid Bills"
                  value={formatCurrency(remainingBills)}
                  valueStyle={{ color: '#ea580c' }}
                />
                <Text
                  type="secondary"
                  style={{ fontSize: '12px', display: 'block', marginTop: 4 }}
                >
                  Unpaid liabilities and expenses
                </Text>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Statistic
                  title={
                    <Space>
                      <span>Overall Funds</span>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                          cashForm.setFieldsValue({
                            current_cash: profile?.current_cash || 0,
                          });
                          setIsEditCashModalOpen(true);
                        }}
                        style={{ padding: 0, height: 'auto' }}
                      />
                    </Space>
                  }
                  value={formatCurrency(profile?.current_cash || 0)}
                  valueStyle={{ color: '#2563eb' }}
                />
                <Text
                  type="secondary"
                  style={{ fontSize: '12px', display: 'block', marginTop: 4 }}
                >
                  Current cash on hand
                </Text>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Statistic
                  title="Remaining Funds After Paying Remaining Bills"
                  value={formatCurrency(
                    (profile?.current_cash || 0) - remainingBills
                  )}
                  valueStyle={{
                    color:
                      (profile?.current_cash || 0) - remainingBills >= 0
                        ? '#16a34a'
                        : '#dc2626',
                  }}
                />
                <Text
                  type="secondary"
                  style={{ fontSize: '12px', display: 'block', marginTop: 4 }}
                >
                  Cash on hand - Unpaid bills
                </Text>
              </Col>
            </Row>
          </Card>

          {/* Bills List */}
          {billsForMonth.length === 0 ? (
            <Card>
              <Empty
                description={`No bills due in ${monthNames[selectedMonth]} ${selectedYear}`}
              />
            </Card>
          ) : (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {Object.keys(billsByDate)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map((day) => {
                  const dayBills = billsByDate[parseInt(day)];
                  // Separate totals for income and bills
                  const dayIncome = dayBills
                    .filter((bill) => bill.type === 'income')
                    .reduce((sum, bill) => sum + bill.amount, 0);
                  const dayBillsTotal = dayBills
                    .filter((bill) => {
                      // Only count expenses/bills (not income, not budgets)
                      if (bill.type === 'income') return false;
                      if (bill.type === 'budget') return false; // Budgets are not bills
                      // When paidFilter is 'all', include all bills in total
                      if (paidFilter === 'all') {
                        return true;
                      }
                      // When paidFilter is 'paid', only count paid bills
                      if (paidFilter === 'paid') {
                        return bill.isPaid;
                      }
                      // When paidFilter is 'unpaid' or 'unchecked', only count unpaid bills
                      if (
                        paidFilter === 'unpaid' ||
                        paidFilter === 'unchecked'
                      ) {
                        return !bill.isPaid;
                      }
                      return true;
                    })
                    .reduce((sum, bill) => sum + bill.amount, 0);

                  return (
                    <Card
                      key={day}
                      style={{
                        borderLeftWidth: 4,
                        borderLeftColor: '#e5e7eb',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 16,
                          paddingBottom: 16,
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        <div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {new Date(
                              selectedYear,
                              selectedMonth,
                              parseInt(day)
                            ).toLocaleDateString('en-US', {
                              weekday: 'long',
                            })}
                          </Text>
                          <Title level={4} style={{ margin: '4px 0 0 0' }}>
                            {parseInt(day)} {monthNames[selectedMonth]}
                          </Title>
                        </div>
                        <Space direction="vertical" align="end">
                          {dayIncome > 0 && (
                            <div>
                              <Text
                                type="secondary"
                                style={{ fontSize: '12px' }}
                              >
                                Income
                              </Text>
                              <div
                                style={{
                                  fontSize: '18px',
                                  fontWeight: 600,
                                  color: '#16a34a',
                                }}
                              >
                                {formatCurrency(dayIncome)}
                              </div>
                            </div>
                          )}
                          {dayBillsTotal > 0 && (
                            <div>
                              <Text
                                type="secondary"
                                style={{ fontSize: '12px' }}
                              >
                                Bills
                              </Text>
                              <div
                                style={{
                                  fontSize: '18px',
                                  fontWeight: 600,
                                  color: '#dc2626',
                                }}
                              >
                                {formatCurrency(dayBillsTotal)}
                              </div>
                            </div>
                          )}
                          {dayIncome === 0 && dayBillsTotal === 0 && (
                            <Text type="secondary">{formatCurrency(0)}</Text>
                          )}
                        </Space>
                      </div>

                      <List
                        dataSource={dayBills}
                        renderItem={(bill, index) => {
                          // Budgets are never completed (no strikethrough)
                          const isCompleted =
                            bill.type === 'budget'
                              ? false
                              : bill.isPaid ||
                                (bill.type === 'income' && bill.isReceived);

                          // Calculate budget remaining amount if it's a budget
                          const budgetRemaining =
                            bill.type === 'budget' && bill.budgetExpenses
                              ? bill.amount -
                                bill.budgetExpenses
                                  .filter((e: { isPaid: boolean }) => e.isPaid)
                                  .reduce(
                                    (sum: number, e: { amount: number }) =>
                                      sum + e.amount,
                                    0
                                  )
                              : null;

                          return (
                            <div key={`${bill.type}-${bill.id}-${index}`}>
                              <List.Item
                                style={{
                                  opacity: isCompleted ? 0.6 : 1,
                                  padding: '12px 0',
                                  borderBottom:
                                    index < dayBills.length - 1 ||
                                    (bill.type === 'budget' &&
                                      bill.budgetExpenses &&
                                      bill.budgetExpenses.length > 0)
                                      ? '1px solid #f0f0f0'
                                      : 'none',
                                }}
                              >
                                <List.Item.Meta
                                  avatar={
                                    bill.type ===
                                    'budget' ? null : bill.type ===
                                      'liability' ? (
                                      <Checkbox
                                        checked={bill.isPaid}
                                        disabled={bill.isPaid}
                                        onChange={() =>
                                          handleTogglePaid(
                                            bill,
                                            selectedYear,
                                            selectedMonth
                                          )
                                        }
                                      />
                                    ) : bill.type === 'expense' &&
                                      !bill.isPaid ? (
                                      <Checkbox
                                        checked={false}
                                        onChange={() =>
                                          handleMarkExpensePaid(
                                            bill,
                                            selectedYear,
                                            selectedMonth
                                          )
                                        }
                                      />
                                    ) : bill.type === 'income' ? (
                                      <Checkbox
                                        checked={bill.isReceived || false}
                                        disabled={bill.isReceived || false}
                                        onChange={() => {
                                          const originalIncome =
                                            incomeSources?.find(
                                              (inc) =>
                                                inc.id === bill.id ||
                                                bill.id.startsWith(inc.id)
                                            );
                                          handleMarkIncomeReceived(
                                            {
                                              id: bill.id,
                                              name: bill.name,
                                              amount: bill.amount,
                                              frequency:
                                                originalIncome?.frequency,
                                              category:
                                                originalIncome?.category,
                                            },
                                            selectedYear,
                                            selectedMonth
                                          );
                                        }}
                                      />
                                    ) : null
                                  }
                                  title={
                                    <Space>
                                      <Text strong={bill.type === 'budget'}>
                                        {bill.name}
                                      </Text>
                                      <Tag
                                        color={getCategoryColor(
                                          bill.type,
                                          bill.category,
                                          bill.payment_type
                                        )}
                                      >
                                        {bill.type === 'budget'
                                          ? 'Budget'
                                          : bill.type === 'expense'
                                          ? 'Recurring Expense'
                                          : getCategoryLabel(
                                              bill.type,
                                              bill.category,
                                              bill.payment_type,
                                              bill.liability,
                                              selectedYear,
                                              selectedMonth
                                            )}
                                      </Tag>
                                    </Space>
                                  }
                                  description={
                                    bill.type === 'budget' &&
                                    budgetRemaining !== null ? (
                                      <Space direction="vertical" size={0}>
                                        <Text
                                          type="secondary"
                                          style={{ fontSize: '12px' }}
                                        >
                                          Total: {formatCurrency(bill.amount)} •
                                          Remaining:{' '}
                                          <span
                                            style={{
                                              color:
                                                budgetRemaining >= 0
                                                  ? '#16a34a'
                                                  : '#dc2626',
                                              fontWeight: 600,
                                            }}
                                          >
                                            {formatCurrency(budgetRemaining)}
                                          </span>
                                        </Text>
                                      </Space>
                                    ) : bill.source ? (
                                      <Text
                                        type="secondary"
                                        style={{ fontSize: '12px' }}
                                      >
                                        {bill.source}
                                      </Text>
                                    ) : null
                                  }
                                />
                                <Space>
                                  <Text
                                    strong
                                    delete={
                                      bill.type === 'budget'
                                        ? false
                                        : bill.isPaid ||
                                          (bill.type === 'income' &&
                                            bill.isReceived)
                                    }
                                    style={{
                                      fontSize: '16px',
                                      color:
                                        bill.type === 'budget'
                                          ? '#2563eb'
                                          : bill.isPaid ||
                                            (bill.type === 'income' &&
                                              bill.isReceived)
                                          ? '#9ca3af'
                                          : bill.type === 'income'
                                          ? '#16a34a'
                                          : '#dc2626',
                                    }}
                                  >
                                    {bill.type === 'income' ? '+' : '-'}
                                    {formatCurrency(bill.amount)}
                                  </Text>
                                  {bill.type === 'budget' ? (
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<PlusOutlined />}
                                      onClick={() => {
                                        const budget = budgets?.find(
                                          (b) => b.id === bill.id
                                        );
                                        if (budget) {
                                          setSelectedBudgetForExpense({
                                            budget: {
                                              id: budget.id,
                                              name: budget.name,
                                            },
                                            year: selectedYear,
                                            month: selectedMonth,
                                          });
                                          budgetExpenseForm.resetFields();
                                          budgetExpenseForm.setFieldsValue({
                                            budget_id: budget.id,
                                            frequency: 'one_time',
                                            expense_date: dayjs(
                                              new Date(
                                                selectedYear,
                                                selectedMonth,
                                                1
                                              )
                                            ),
                                            is_paid: false,
                                          });
                                        }
                                      }}
                                      style={{ color: '#1890ff' }}
                                    />
                                  ) : (
                                    bill.type === 'liability' &&
                                    !bill.isPaid && (
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={<EditOutlined />}
                                        onClick={() =>
                                          handleEditLiabilityOverride(
                                            bill,
                                            selectedYear,
                                            selectedMonth
                                          )
                                        }
                                        style={{ color: '#1890ff' }}
                                      />
                                    )
                                  )}
                                  {bill.type === 'expense' &&
                                    bill.frequency !== 'one_time' &&
                                    !bill.isPaid && (
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={<EditOutlined />}
                                        onClick={() =>
                                          handleEditExpenseOverride(
                                            bill,
                                            selectedYear,
                                            selectedMonth
                                          )
                                        }
                                        style={{ color: '#1890ff' }}
                                      />
                                    )}
                                </Space>
                              </List.Item>
                              {/* Render nested expenses for budgets */}
                              {bill.type === 'budget' &&
                                bill.budgetExpenses &&
                                bill.budgetExpenses.length > 0 && (
                                  <div
                                    style={{ paddingLeft: 40, paddingTop: 8 }}
                                  >
                                    {bill.budgetExpenses.map(
                                      (
                                        expense: {
                                          type: 'expense';
                                          id: string;
                                          name: string;
                                          amount: number;
                                          category: string;
                                          dueDate: Date;
                                          isPaid: boolean;
                                          frequency?:
                                            | 'monthly'
                                            | 'weekly'
                                            | 'one_time';
                                        },
                                        expIndex: number
                                      ) => {
                                        const expenseCompleted = expense.isPaid;
                                        return (
                                          <List.Item
                                            key={`budget-expense-${expense.id}-${expIndex}`}
                                            style={{
                                              opacity: expenseCompleted
                                                ? 0.6
                                                : 1,
                                              padding: '8px 0',
                                              borderBottom:
                                                expIndex <
                                                bill.budgetExpenses!.length - 1
                                                  ? '1px solid #f0f0f0'
                                                  : 'none',
                                            }}
                                          >
                                            <List.Item.Meta
                                              avatar={
                                                !expense.isPaid ? (
                                                  <Checkbox
                                                    checked={false}
                                                    onChange={() =>
                                                      handleMarkExpensePaid(
                                                        expense,
                                                        selectedYear,
                                                        selectedMonth
                                                      )
                                                    }
                                                  />
                                                ) : null
                                              }
                                              title={
                                                <Text
                                                  delete={expenseCompleted}
                                                  strong={!expenseCompleted}
                                                  style={{ fontSize: '14px' }}
                                                >
                                                  {expense.name}
                                                </Text>
                                              }
                                            />
                                            <Text
                                              strong
                                              delete={expenseCompleted}
                                              style={{
                                                fontSize: '14px',
                                                color: expenseCompleted
                                                  ? '#9ca3af'
                                                  : '#dc2626',
                                              }}
                                            >
                                              -{formatCurrency(expense.amount)}
                                            </Text>
                                          </List.Item>
                                        );
                                      }
                                    )}
                                  </div>
                                )}
                            </div>
                          );
                        }}
                      />
                    </Card>
                  );
                })}
            </Space>
          )}
        </>
      ) : (
        /* List View */
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {Object.keys(billsByMonth)
            .filter((monthKey) => billsByMonth[monthKey].length > 0)
            .map((monthKey) => {
              const [year, month] = monthKey.split('-').map(Number);
              const monthBills = billsByMonth[monthKey];
              // Separate totals for income and bills
              const monthIncome = monthBills
                .filter((bill) => bill.type === 'income')
                .reduce((sum, bill) => sum + bill.amount, 0);
              const monthBillsTotal = monthBills
                .filter((bill) => {
                  // Only count expenses/bills (not income, not budgets)
                  if (bill.type === 'income') return false;
                  if (bill.type === 'budget') return false; // Budgets are not bills
                  // When paidFilter is 'all', include all bills in total
                  if (paidFilter === 'all') {
                    return true;
                  }
                  // When paidFilter is 'paid', only count paid bills
                  if (paidFilter === 'paid') {
                    return bill.isPaid;
                  }
                  // When paidFilter is 'unpaid' or 'unchecked', only count unpaid bills
                  if (paidFilter === 'unpaid' || paidFilter === 'unchecked') {
                    return !bill.isPaid;
                  }
                  return true;
                })
                .reduce((sum, bill) => sum + bill.amount, 0);
              const isCurrentMonth =
                year === new Date().getFullYear() &&
                month === new Date().getMonth();

              // Group bills by date for this month
              const billsByDateForMonth: Record<number, typeof monthBills> = {};
              monthBills.forEach((bill) => {
                const day = bill.dueDate.getDate();
                if (!billsByDateForMonth[day]) {
                  billsByDateForMonth[day] = [];
                }
                billsByDateForMonth[day].push(bill);
              });

              return (
                <Card
                  key={monthKey}
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: '#e5e7eb',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <Title level={3} style={{ margin: 0 }}>
                        {monthNames[month]} {year}
                      </Title>
                      {isCurrentMonth && (
                        <Tag color="blue" style={{ marginTop: 4 }}>
                          Current Month
                        </Tag>
                      )}
                    </div>
                    <Space direction="vertical" align="end">
                      {monthIncome > 0 && (
                        <div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Income
                          </Text>
                          <div
                            style={{
                              fontSize: '20px',
                              fontWeight: 600,
                              color: '#16a34a',
                            }}
                          >
                            {formatCurrency(monthIncome)}
                          </div>
                        </div>
                      )}
                      {monthBillsTotal > 0 && (
                        <div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Bills
                          </Text>
                          <div
                            style={{
                              fontSize: '20px',
                              fontWeight: 600,
                              color: '#dc2626',
                            }}
                          >
                            {formatCurrency(monthBillsTotal)}
                          </div>
                        </div>
                      )}
                      {monthIncome === 0 && monthBillsTotal === 0 && (
                        <Text type="secondary">{formatCurrency(0)}</Text>
                      )}
                      <Text
                        type="secondary"
                        style={{ fontSize: '12px', marginTop: 8 }}
                      >
                        {monthBills.length}{' '}
                        {monthBills.length === 1
                          ? 'transaction'
                          : 'transactions'}
                      </Text>
                    </Space>
                  </div>

                  <Space
                    direction="vertical"
                    size="middle"
                    style={{ width: '100%' }}
                  >
                    {Object.keys(billsByDateForMonth)
                      .sort((a, b) => parseInt(a) - parseInt(b))
                      .map((day) => {
                        const dayBills = billsByDateForMonth[parseInt(day)];
                        // Separate totals for income and bills
                        const dayIncome = dayBills
                          .filter((bill) => bill.type === 'income')
                          .reduce((sum, bill) => sum + bill.amount, 0);
                        const dayBillsTotal = dayBills
                          .filter((bill) => {
                            // Only count expenses/bills (not income, not budgets)
                            if (bill.type === 'income') return false;
                            if (bill.type === 'budget') return false; // Budgets are not bills
                            // When paidFilter is 'all', include all bills in total
                            if (paidFilter === 'all') {
                              return true;
                            }
                            // When paidFilter is 'paid', only count paid bills
                            if (paidFilter === 'paid') {
                              return bill.isPaid;
                            }
                            // When paidFilter is 'unpaid' or 'unchecked', only count unpaid bills
                            if (
                              paidFilter === 'unpaid' ||
                              paidFilter === 'unchecked'
                            ) {
                              return !bill.isPaid;
                            }
                            return true;
                          })
                          .reduce((sum, bill) => sum + bill.amount, 0);
                        const dayDate = new Date(year, month, parseInt(day));
                        const isPast =
                          dayDate < new Date(new Date().setHours(0, 0, 0, 0));

                        return (
                          <div
                            key={day}
                            style={{
                              borderLeft: '2px solid #e5e7eb',
                              paddingLeft: 16,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 8,
                              }}
                            >
                              <div>
                                <Text
                                  type="secondary"
                                  style={{ fontSize: '12px' }}
                                >
                                  {dayDate.toLocaleDateString('en-US', {
                                    weekday: 'short',
                                  })}
                                </Text>
                                <div
                                  style={{
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    color: isPast ? '#6b7280' : undefined,
                                  }}
                                >
                                  {parseInt(day)} {monthNames[month]}
                                </div>
                              </div>
                              <Space direction="vertical" align="end">
                                {dayIncome > 0 && (
                                  <Text
                                    strong
                                    style={{
                                      color: '#16a34a',
                                      fontSize: '14px',
                                    }}
                                  >
                                    +{formatCurrency(dayIncome)}
                                  </Text>
                                )}
                                {dayBillsTotal > 0 && (
                                  <Text
                                    strong
                                    style={{
                                      color: '#dc2626',
                                      fontSize: '14px',
                                    }}
                                  >
                                    -{formatCurrency(dayBillsTotal)}
                                  </Text>
                                )}
                                {dayIncome === 0 && dayBillsTotal === 0 && (
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: '12px' }}
                                  >
                                    {formatCurrency(0)}
                                  </Text>
                                )}
                              </Space>
                            </div>
                            <List
                              dataSource={dayBills}
                              renderItem={(bill, index) => {
                                // Budgets are never completed (no strikethrough)
                                const isCompleted =
                                  bill.type === 'budget'
                                    ? false
                                    : bill.isPaid ||
                                      (bill.type === 'income' &&
                                        bill.isReceived);

                                // Calculate budget remaining amount if it's a budget
                                const budgetRemaining =
                                  bill.type === 'budget' && bill.budgetExpenses
                                    ? bill.amount -
                                      bill.budgetExpenses
                                        .filter(
                                          (e: { isPaid: boolean }) => e.isPaid
                                        )
                                        .reduce(
                                          (
                                            sum: number,
                                            e: { amount: number }
                                          ) => sum + e.amount,
                                          0
                                        )
                                    : null;

                                return (
                                  <div key={`${bill.type}-${bill.id}-${index}`}>
                                    <List.Item
                                      style={{
                                        opacity: isCompleted ? 0.6 : 1,
                                        padding: '8px 0 8px 8px',
                                        borderLeft: '2px solid #f0f0f0',
                                      }}
                                    >
                                      <List.Item.Meta
                                        avatar={
                                          bill.type ===
                                          'budget' ? null : bill.type ===
                                            'liability' ? (
                                            <Checkbox
                                              checked={bill.isPaid}
                                              disabled={bill.isPaid}
                                              onChange={() =>
                                                handleTogglePaid(
                                                  bill,
                                                  year,
                                                  month
                                                )
                                              }
                                            />
                                          ) : bill.type === 'expense' &&
                                            !bill.isPaid ? (
                                            <Checkbox
                                              checked={false}
                                              onChange={() =>
                                                handleMarkExpensePaid(
                                                  bill,
                                                  year,
                                                  month
                                                )
                                              }
                                            />
                                          ) : bill.type === 'income' ? (
                                            <Checkbox
                                              checked={bill.isReceived || false}
                                              disabled={
                                                bill.isReceived || false
                                              }
                                              onChange={() => {
                                                const originalIncome =
                                                  incomeSources?.find(
                                                    (inc) =>
                                                      inc.id === bill.id ||
                                                      bill.id.startsWith(inc.id)
                                                  );
                                                handleMarkIncomeReceived(
                                                  {
                                                    id: bill.id,
                                                    name: bill.name,
                                                    amount: bill.amount,
                                                    frequency:
                                                      originalIncome?.frequency,
                                                    category:
                                                      originalIncome?.category,
                                                  },
                                                  year,
                                                  month
                                                );
                                              }}
                                            />
                                          ) : null
                                        }
                                        title={
                                          <Space>
                                            <Text
                                              strong={bill.type === 'budget'}
                                              style={{ fontSize: '14px' }}
                                            >
                                              {bill.name}
                                            </Text>
                                            <Tag
                                              color={getCategoryColor(
                                                bill.type,
                                                bill.category,
                                                bill.payment_type
                                              )}
                                            >
                                              {bill.type === 'budget'
                                                ? 'Budget'
                                                : bill.type === 'expense'
                                                ? 'Recurring Expense'
                                                : getCategoryLabel(
                                                    bill.type,
                                                    bill.category,
                                                    bill.payment_type,
                                                    bill.liability,
                                                    year,
                                                    month
                                                  )}
                                            </Tag>
                                          </Space>
                                        }
                                        description={
                                          bill.type === 'budget' &&
                                          budgetRemaining !== null ? (
                                            <Space
                                              direction="vertical"
                                              size={0}
                                            >
                                              <Text
                                                type="secondary"
                                                style={{ fontSize: '12px' }}
                                              >
                                                Total:{' '}
                                                {formatCurrency(bill.amount)} •
                                                Remaining:{' '}
                                                <span
                                                  style={{
                                                    color:
                                                      budgetRemaining >= 0
                                                        ? '#16a34a'
                                                        : '#dc2626',
                                                    fontWeight: 600,
                                                  }}
                                                >
                                                  {formatCurrency(
                                                    budgetRemaining
                                                  )}
                                                </span>
                                              </Text>
                                            </Space>
                                          ) : bill.source ? (
                                            <Text
                                              type="secondary"
                                              style={{ fontSize: '12px' }}
                                            >
                                              {bill.source}
                                            </Text>
                                          ) : null
                                        }
                                      />
                                      <Space>
                                        <Text
                                          strong
                                          delete={
                                            bill.type === 'budget'
                                              ? false
                                              : bill.isPaid ||
                                                (bill.type === 'income' &&
                                                  bill.isReceived)
                                          }
                                          style={{
                                            fontSize: '14px',
                                            color:
                                              bill.type === 'budget'
                                                ? '#2563eb'
                                                : bill.isPaid ||
                                                  (bill.type === 'income' &&
                                                    bill.isReceived)
                                                ? '#9ca3af'
                                                : bill.type === 'income'
                                                ? '#16a34a'
                                                : '#dc2626',
                                          }}
                                        >
                                          {bill.type === 'income' ? '+' : '-'}
                                          {formatCurrency(bill.amount)}
                                        </Text>
                                        {bill.type === 'budget' ? (
                                          <Button
                                            type="text"
                                            size="small"
                                            icon={<PlusOutlined />}
                                            onClick={() => {
                                              const budget = budgets?.find(
                                                (b) => b.id === bill.id
                                              );
                                              if (budget) {
                                                setSelectedBudgetForExpense({
                                                  budget: {
                                                    id: budget.id,
                                                    name: budget.name,
                                                  },
                                                  year,
                                                  month,
                                                });
                                                budgetExpenseForm.resetFields();
                                                budgetExpenseForm.setFieldsValue(
                                                  {
                                                    budget_id: budget.id,
                                                    expenses: [
                                                      {
                                                        description: '',
                                                        amount: undefined,
                                                      },
                                                    ], // Start with one empty expense
                                                  }
                                                );
                                              }
                                            }}
                                            style={{ color: '#1890ff' }}
                                          >
                                            Add Expense
                                          </Button>
                                        ) : (
                                          bill.type === 'liability' &&
                                          !bill.isPaid && (
                                            <Button
                                              type="text"
                                              size="small"
                                              icon={<EditOutlined />}
                                              onClick={() =>
                                                handleEditLiabilityOverride(
                                                  bill,
                                                  year,
                                                  month
                                                )
                                              }
                                              style={{ color: '#1890ff' }}
                                            />
                                          )
                                        )}
                                        {bill.type === 'expense' &&
                                          bill.frequency !== 'one_time' &&
                                          !bill.isPaid && (
                                            <Button
                                              type="text"
                                              size="small"
                                              icon={<EditOutlined />}
                                              onClick={() =>
                                                handleEditExpenseOverride(
                                                  bill,
                                                  year,
                                                  month
                                                )
                                              }
                                              style={{ color: '#1890ff' }}
                                            />
                                          )}
                                      </Space>
                                    </List.Item>
                                    {/* Render nested expenses for budgets */}
                                    {bill.type === 'budget' &&
                                      bill.budgetExpenses &&
                                      bill.budgetExpenses.length > 0 && (
                                        <div
                                          style={{
                                            paddingLeft: 40,
                                            paddingTop: 8,
                                          }}
                                        >
                                          {bill.budgetExpenses.map(
                                            (
                                              expense: {
                                                type: 'expense';
                                                id: string;
                                                name: string;
                                                amount: number;
                                                category: string;
                                                dueDate: Date;
                                                isPaid: boolean;
                                                frequency?:
                                                  | 'monthly'
                                                  | 'weekly'
                                                  | 'one_time';
                                              },
                                              expIndex: number
                                            ) => {
                                              const expenseCompleted =
                                                expense.isPaid;
                                              return (
                                                <List.Item
                                                  key={`budget-expense-${expense.id}-${expIndex}`}
                                                  style={{
                                                    opacity: expenseCompleted
                                                      ? 0.6
                                                      : 1,
                                                    padding: '6px 0 6px 8px',
                                                    borderLeft:
                                                      '2px solid #e5e7eb',
                                                  }}
                                                >
                                                  <List.Item.Meta
                                                    avatar={
                                                      !expense.isPaid ? (
                                                        <Checkbox
                                                          checked={false}
                                                          onChange={() =>
                                                            handleMarkExpensePaid(
                                                              expense,
                                                              year,
                                                              month
                                                            )
                                                          }
                                                        />
                                                      ) : null
                                                    }
                                                    title={
                                                      <Text
                                                        delete={
                                                          expenseCompleted
                                                        }
                                                        strong={
                                                          !expenseCompleted
                                                        }
                                                        style={{
                                                          fontSize: '13px',
                                                        }}
                                                      >
                                                        {expense.name}
                                                      </Text>
                                                    }
                                                  />
                                                  <Text
                                                    strong
                                                    delete={expenseCompleted}
                                                    style={{
                                                      fontSize: '13px',
                                                      color: expenseCompleted
                                                        ? '#9ca3af'
                                                        : '#dc2626',
                                                    }}
                                                  >
                                                    -
                                                    {formatCurrency(
                                                      expense.amount
                                                    )}
                                                  </Text>
                                                </List.Item>
                                              );
                                            }
                                          )}
                                        </div>
                                      )}
                                  </div>
                                );
                              }}
                            />
                          </div>
                        );
                      })}
                  </Space>
                </Card>
              );
            })}

          {Object.keys(billsByMonth).filter(
            (monthKey) => billsByMonth[monthKey].length > 0
          ).length === 0 && (
            <Card>
              <Empty description="No upcoming bills in the next 12 months" />
            </Card>
          )}
        </Space>
      )}

      {/* Confirmation Modal */}
      <Modal
        open={pendingBill !== null}
        onCancel={handleCancelPaid}
        onOk={handleConfirmPaid}
        title="Mark Bill as Paid"
        okText="Confirm Payment"
        cancelText="Cancel"
      >
        {pendingBill && (
          <Form
            key={pendingBill.bill.id}
            form={billForm}
            layout="vertical"
            initialValues={{
              overrideAmount: pendingBill.bill.amount,
            }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Alert
                message="Confirm Payment"
                description="Mark this bill as paid. You can override the amount if the actual payment differs from the expected amount."
                type="warning"
                showIcon
              />
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Bill Name">
                  {pendingBill.bill.name}
                </Descriptions.Item>
                <Descriptions.Item label="Expected Amount">
                  {formatCurrency(pendingBill.bill.amount)}
                </Descriptions.Item>
                <Descriptions.Item label="Due Month">
                  {monthNames[pendingBill.month]} {pendingBill.year}
                </Descriptions.Item>
                <Descriptions.Item label="Payment Date">
                  {new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Descriptions.Item>
              </Descriptions>
              <Form.Item
                label="Actual Amount Paid (Optional)"
                name="overrideAmount"
                tooltip="Leave empty to use the expected amount, or enter the actual amount you paid"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="₱"
                  min={0}
                  step={0.01}
                  precision={2}
                  placeholder={`Default: ${formatCurrency(
                    pendingBill.bill.amount
                  )}`}
                />
              </Form.Item>
            </Space>
          </Form>
        )}
      </Modal>

      {/* Confirmation Modal for Marking Income as Received */}
      <Modal
        open={pendingIncome !== null}
        onCancel={handleCancelIncomeReceived}
        onOk={handleConfirmIncomeReceived}
        title="Mark Income as Received"
        okText="Confirm Received"
        cancelText="Cancel"
      >
        {pendingIncome && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Alert
              message="Confirm Income Received"
              description="Are you sure you want to mark this income as received? This will update your cash on hand."
              type="warning"
              showIcon
            />
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Income Name">
                {pendingIncome.income.name}
              </Descriptions.Item>
              <Descriptions.Item label="Amount">
                {formatCurrency(pendingIncome.income.amount)}
              </Descriptions.Item>
            </Descriptions>
          </Space>
        )}
      </Modal>

      {/* Confirmation Modal for Marking Recurring Expense as Paid */}
      <Modal
        open={pendingExpense !== null}
        onCancel={handleCancelExpensePaid}
        onOk={handleConfirmExpensePaid}
        title="Mark Expense as Paid"
        okText="Confirm Payment"
        cancelText="Cancel"
      >
        {pendingExpense && (
          <Form
            key={pendingExpense.expense.id}
            form={expenseForm}
            layout="vertical"
            initialValues={{
              overrideAmount: pendingExpense.expense.amount,
            }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Alert
                message="Confirm Payment"
                description="Mark this recurring expense as paid. You can override the amount if the actual payment differs from the expected amount."
                type="warning"
                showIcon
              />
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Expense Name">
                  {pendingExpense.expense.name}
                </Descriptions.Item>
                <Descriptions.Item label="Expected Amount">
                  {formatCurrency(pendingExpense.expense.amount)}
                </Descriptions.Item>
              </Descriptions>
              <Form.Item
                label="Actual Amount Paid (Optional)"
                name="overrideAmount"
                tooltip="Leave empty to use the expected amount, or enter the actual amount you paid"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="₱"
                  min={0}
                  step={0.01}
                  precision={2}
                  placeholder={`Default: ${formatCurrency(
                    pendingExpense.expense.amount
                  )}`}
                />
              </Form.Item>
            </Space>
          </Form>
        )}
      </Modal>

      {/* Edit Liability Override Modal */}
      <Modal
        open={editingLiabilityOverride !== null}
        onCancel={handleCancelLiabilityOverride}
        footer={[
          <Button key="cancel" onClick={handleCancelLiabilityOverride}>
            Cancel
          </Button>,
          <Button
            key="skip"
            onClick={() => handleConfirmLiabilityOverride(true)}
            style={{ color: '#faad14' }}
          >
            Skip This Month
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={() => handleConfirmLiabilityOverride(false)}
          >
            Create Override
          </Button>,
        ]}
        title="Edit Liability Override"
      >
        {editingLiabilityOverride && (
          <Form
            key={editingLiabilityOverride.liability.id}
            form={liabilityOverrideForm}
            layout="vertical"
            initialValues={{
              amount: editingLiabilityOverride.liability.amount,
              expense_date: dayjs(
                new Date(
                  editingLiabilityOverride.year,
                  editingLiabilityOverride.month,
                  1
                )
              ),
            }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Alert
                message="Create Liability Override"
                description="This will create a one-time expense with the specified amount and date. The liability will be hidden for this month."
                type="info"
                showIcon
              />
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Liability Name">
                  {editingLiabilityOverride.liability.name}
                </Descriptions.Item>
                <Descriptions.Item label="Original Amount">
                  {formatCurrency(editingLiabilityOverride.liability.amount)}
                </Descriptions.Item>
              </Descriptions>
              <Form.Item
                label="Amount"
                name="amount"
                rules={[
                  { required: true, message: 'Please enter an amount' },
                  {
                    type: 'number',
                    min: 0.01,
                    message: 'Amount must be greater than 0',
                  },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="₱"
                  min={0}
                  step={0.01}
                  precision={2}
                />
              </Form.Item>
              <Form.Item
                label="Expense Date"
                name="expense_date"
                rules={[
                  { required: true, message: 'Please select an expense date' },
                ]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Space>
          </Form>
        )}
      </Modal>

      {/* Edit Expense Override Modal */}
      <Modal
        open={editingExpenseOverride !== null}
        onCancel={handleCancelExpenseOverride}
        footer={[
          <Button key="cancel" onClick={handleCancelExpenseOverride}>
            Cancel
          </Button>,
          <Button
            key="skip"
            onClick={() => handleConfirmExpenseOverride(true)}
            style={{ color: '#faad14' }}
          >
            Skip This Month
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={() => handleConfirmExpenseOverride(false)}
          >
            Create Override
          </Button>,
        ]}
        title="Edit Expense Override"
      >
        {editingExpenseOverride && (
          <Form
            key={editingExpenseOverride.expense.id}
            form={expenseOverrideForm}
            layout="vertical"
            initialValues={{
              amount: editingExpenseOverride.expense.amount,
              expense_date: dayjs(
                new Date(
                  editingExpenseOverride.year,
                  editingExpenseOverride.month,
                  1
                )
              ),
            }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Alert
                message="Create Expense Override"
                description="This will create a one-time expense with the specified amount and date. The recurring expense will be hidden for this month."
                type="info"
                showIcon
              />
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Expense Name">
                  {editingExpenseOverride.expense.name}
                </Descriptions.Item>
                <Descriptions.Item label="Original Amount">
                  {formatCurrency(editingExpenseOverride.expense.amount)}
                </Descriptions.Item>
              </Descriptions>
              <Form.Item
                label="Amount"
                name="amount"
                rules={[
                  { required: true, message: 'Please enter an amount' },
                  {
                    type: 'number',
                    min: 0.01,
                    message: 'Amount must be greater than 0',
                  },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  prefix="₱"
                  min={0}
                  step={0.01}
                  precision={2}
                />
              </Form.Item>
              <Form.Item
                label="Expense Date"
                name="expense_date"
                rules={[
                  { required: true, message: 'Please select an expense date' },
                ]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Space>
          </Form>
        )}
      </Modal>

      <Modal
        title="Edit Cash on Hand"
        open={isEditCashModalOpen}
        onCancel={() => {
          setIsEditCashModalOpen(false);
          cashForm.resetFields();
        }}
        onOk={async () => {
          try {
            const values = await cashForm.validateFields();
            updateProfile(
              { current_cash: values.current_cash },
              {
                onSuccess: () => {
                  message.success('Cash on hand updated successfully');
                  setIsEditCashModalOpen(false);
                  cashForm.resetFields();
                },
                onError: (error: Error) => {
                  message.error(
                    'Error updating cash: ' +
                      (error instanceof Error ? error.message : 'Unknown error')
                  );
                },
              }
            );
          } catch (error) {
            // Form validation errors are handled by Ant Design
          }
        }}
        confirmLoading={isUpdatingProfile}
        okText="Update"
        cancelText="Cancel"
      >
        <Form form={cashForm} layout="vertical">
          <Form.Item
            name="current_cash"
            label="Cash on Hand (₱)"
            rules={[
              { required: true, message: 'Please enter the cash amount' },
              {
                type: 'number',
                min: 0,
                message: 'Cash amount must be 0 or greater',
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              prefix="₱"
              step={0.01}
              min={0}
              placeholder="0.00"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Budget Expense Creation Modal */}
      <Modal
        title={`Add Expenses to ${
          selectedBudgetForExpense?.budget.name || 'Budget'
        }`}
        open={!!selectedBudgetForExpense}
        onCancel={() => {
          setSelectedBudgetForExpense(null);
          budgetExpenseForm.resetFields();
        }}
        onOk={budgetExpenseForm.submit}
        okText="Create Expenses"
        cancelText="Cancel"
        width={700}
      >
        <Form
          form={budgetExpenseForm}
          layout="vertical"
          onFinish={handleSubmitBudgetExpense}
        >
          <Form.Item name="budget_id" hidden>
            <Input />
          </Form.Item>

          <Form.List name="expenses">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space
                    key={key}
                    style={{ display: 'flex', marginBottom: 8 }}
                    align="baseline"
                  >
                    <Form.Item
                      {...restField}
                      name={[name, 'description']}
                      rules={[
                        { required: true, message: 'Description required' },
                      ]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <Input placeholder="Description" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'amount']}
                      rules={[
                        { required: true, message: 'Amount required' },
                        { type: 'number', min: 0.01, message: 'Must be > 0' },
                      ]}
                      style={{ width: 150, marginBottom: 0 }}
                    >
                      <InputNumber
                        prefix="₱"
                        step={0.01}
                        min={0}
                        placeholder="0.00"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                    {fields.length > 1 && (
                      <MinusCircleOutlined
                        onClick={() => remove(name)}
                        style={{
                          color: '#dc2626',
                          fontSize: '18px',
                          cursor: 'pointer',
                        }}
                      />
                    )}
                  </Space>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    Add Expense
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </Space>
  );
}
