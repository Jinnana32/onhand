import { useState, useMemo, useEffect, useRef } from 'react';
import { useLiabilities, useExpenses, useIncomeSources } from '../hooks';
import { formatCurrency } from '../lib/utils';
import { Modal } from '../components/Modal';

type ViewMode = 'calendar' | 'list';
type FilterGroup =
  | 'recurring_expenses'
  | 'credit_cards'
  | 'loans'
  | 'installments'
  | 'income'
  | 'other';

export function CashFlow() {
  const { liabilities, isLoading: isLoadingLiabilities } = useLiabilities();
  const {
    expenses,
    isLoading: isLoadingExpenses,
    createExpenseAsync,
  } = useExpenses();
  const { incomeSources, isLoading: isLoadingIncome } = useIncomeSources();
  const isLoading =
    isLoadingLiabilities || isLoadingExpenses || isLoadingIncome;
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedFilters, setSelectedFilters] = useState<FilterGroup[]>([]);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [paidFilter, setPaidFilter] = useState<'all' | 'paid' | 'unpaid'>(
    'all'
  );
  const [pendingBill, setPendingBill] = useState<{
    bill: {
      type: 'liability' | 'expense' | 'income';
      id: string;
      name: string;
      amount: number;
      isPaid: boolean;
    };
    year: number;
    month: number;
  } | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFilterDropdownOpen(false);
      }
    };

    if (isFilterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterDropdownOpen]);

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
    type: 'liability' | 'expense' | 'income';
    category: string;
    payment_type?: 'straight' | 'installment' | null;
  }): FilterGroup => {
    if (bill.type === 'income') {
      return 'income';
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

  // Filter active liabilities, recurring expenses, and recurring income, calculate which ones are due in the selected month
  const billsForMonth = useMemo(() => {
    const bills: Array<{
      type: 'liability' | 'expense' | 'income';
      id: string; // liability id, expense id, or income id
      name: string;
      amount: number;
      category: string;
      payment_type?: 'straight' | 'installment' | null;
      source?: string | null;
      dueDate: Date;
      isPaid: boolean;
      isReceived?: boolean; // For income: whether it has been received
      liability?: { start_date: string | null; months_to_pay: number | null }; // For payment counter
    }> = [];
    const selectedMonthDate = new Date(selectedYear, selectedMonth, 1);
    const selectedMonthEndDate = new Date(selectedYear, selectedMonth + 1, 0);

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
        (e) => e.is_active && e.frequency !== 'one_time'
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
          bills.push({
            type: 'expense',
            id: expense.id,
            name: expense.description,
            amount: expense.amount,
            category: expense.category || 'Bills',
            dueDate,
            isPaid: false, // Recurring expenses are tracked differently
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

          // Only include if the date is valid (handles cases like Feb 30)
          if (
            dueDate.getDate() === paymentDay &&
            dueDate.getMonth() === selectedMonth
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
      filteredBills = filteredBills.filter((bill) => bill.isPaid);
    } else if (paidFilter === 'unpaid') {
      filteredBills = filteredBills.filter((bill) => !bill.isPaid);
    }

    return filteredBills;
  }, [
    liabilities,
    expenses,
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

  // Calculate remaining bills (unpaid liabilities for the month)
  const remainingBills = useMemo(() => {
    return billsForMonth
      .filter((bill) => {
        // Only liabilities (not expenses or income)
        if (bill.type !== 'liability') return false;
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
    billType: 'liability' | 'expense' | 'income',
    category: string,
    paymentType?: 'straight' | 'installment' | null
  ) => {
    if (billType === 'income') {
      return 'bg-green-100 text-green-800';
    }
    switch (category) {
      case 'credit_card':
        return paymentType === 'installment'
          ? 'bg-orange-100 text-orange-800'
          : 'bg-blue-100 text-blue-800';
      case 'loan':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
    billType: 'liability' | 'expense' | 'income',
    category: string,
    paymentType?: 'straight' | 'installment' | null,
    liability?: { start_date: string | null; months_to_pay: number | null },
    currentYear?: number,
    currentMonth?: number
  ) => {
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
        type: 'liability' | 'expense' | 'income';
        id: string;
        name: string;
        amount: number;
        category: string;
        payment_type?: 'straight' | 'installment' | null;
        source?: string | null;
        dueDate: Date;
        isPaid: boolean;
        isReceived?: boolean; // For income: whether it has been received
        liability?: { start_date: string | null; months_to_pay: number | null }; // For payment counter
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
              isPaid: false, // Recurring expenses are tracked differently
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

            // Only include if the date is valid (handles cases like Feb 30)
            if (
              dueDate.getDate() === paymentDay &&
              dueDate.getMonth() === targetMonth
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
        monthsData[monthKey] = monthsData[monthKey].filter(
          (bill) => bill.isPaid
        );
      } else if (paidFilter === 'unpaid') {
        monthsData[monthKey] = monthsData[monthKey].filter(
          (bill) => !bill.isPaid
        );
      }
    }

    return monthsData;
  }, [
    liabilities,
    expenses,
    incomeSources,
    viewMode,
    selectedFilters,
    paidFilter,
    isBillPaid,
  ]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Cash Flow</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const filterOptions: Array<{ value: FilterGroup; label: string }> = [
    { value: 'income', label: 'Income' },
    { value: 'recurring_expenses', label: 'Recurring Expenses' },
    { value: 'credit_cards', label: 'Credit Cards' },
    { value: 'loans', label: 'Loans' },
    { value: 'installments', label: 'Installments' },
    { value: 'other', label: 'Other' },
  ];

  const handleFilterToggle = (filter: FilterGroup) => {
    setSelectedFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  };

  // Handle marking a bill as paid
  const handleTogglePaid = (
    bill: {
      type: 'liability' | 'expense' | 'income';
      id: string;
      name: string;
      amount: number;
      isPaid: boolean;
    },
    year: number,
    month: number
  ) => {
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

    const { bill } = pendingBill;

    // Create an expense to mark this as paid
    // Use today's date, not the first of the month
    const today = new Date();
    const expenseDateStr = today.toISOString().split('T')[0];

    try {
      await createExpenseAsync({
        description: bill.name,
        amount: bill.amount,
        category: 'Bills',
        expense_date: expenseDateStr,
        frequency: 'one_time',
        liability_id: bill.id, // Link expense to the liability
      });
      // Close the confirmation dialog after successful creation
      setPendingBill(null);
    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Failed to mark bill as paid. Please try again.');
    }
  };

  // Cancel marking bill as paid
  const handleCancelPaid = () => {
    setPendingBill(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Upcoming Bills</h2>
        <div className="flex items-center gap-4">
          {/* Filter Dropdown */}
          <div className="relative" ref={filterDropdownRef}>
            <button
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center gap-2"
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filter
              {selectedFilters.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-800 rounded-full">
                  {selectedFilters.length}
                </span>
              )}
            </button>
            {isFilterDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="py-1">
                  {filterOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFilters.includes(option.value)}
                        onChange={() => handleFilterToggle(option.value)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm text-gray-700">
                        {option.label}
                      </span>
                    </label>
                  ))}
                  {selectedFilters.length > 0 && (
                    <div className="border-t border-gray-200 px-4 py-2">
                      <button
                        onClick={() => setSelectedFilters([])}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Paid/Unpaid Filter */}
          <select
            value={paidFilter}
            onChange={(e) =>
              setPaidFilter(e.target.value as 'all' | 'paid' | 'unpaid')
            }
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <option value="all">All Bills</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Calendar
              </span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                List
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {selectedFilters.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-indigo-900">
              Active filters:
            </span>
            {selectedFilters.map((filter) => {
              const option = filterOptions.find((o) => o.value === filter);
              return (
                <span
                  key={filter}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                >
                  {option?.label}
                  <button
                    onClick={() => handleFilterToggle(filter)}
                    className="ml-2 text-indigo-600 hover:text-indigo-800"
                  >
                    ×
                  </button>
                </span>
              );
            })}
            <button
              onClick={() => setSelectedFilters([])}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium ml-auto"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {viewMode === 'calendar' ? (
        <>
          {/* Month Selector */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <button
                onClick={goToPreviousMonth}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {monthNames[selectedMonth]} {selectedYear}
                </h3>
                <button
                  onClick={goToCurrentMonth}
                  className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md"
                >
                  Today
                </button>
              </div>

              <button
                onClick={goToNextMonth}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="grid grid-cols-2 gap-6">
              {/* Total Bills */}
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bills</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(totalBills)}
                </p>
              </div>

              {/* Total Income */}
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Income
                </p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(totalIncome)}
                </p>
              </div>

              {/* Remaining Bills */}
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Remaining Bills
                </p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {formatCurrency(remainingBills)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Unpaid liabilities</p>
              </div>

              {/* Remaining Money */}
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Cash on hand
                </p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    remainingMoney >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(remainingMoney)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Income received - Expenses
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Expected remaining cash:{' '}
                  {formatCurrency(expectedRemainingCash)}
                </p>
              </div>
            </div>
          </div>

          {/* Bills List */}
          {billsForMonth.length === 0 ? (
            <div className="bg-white p-12 rounded-lg shadow text-center">
              <p className="text-gray-500 text-lg">
                No bills due in {monthNames[selectedMonth]} {selectedYear}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
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
                      // Only count expenses/bills (not income)
                      if (bill.type === 'income') return false;
                      // When paidFilter is 'all', exclude paid bills from total
                      if (paidFilter === 'all') {
                        return !bill.isPaid;
                      }
                      return true;
                    })
                    .reduce((sum, bill) => sum + bill.amount, 0);
                  const isPast =
                    new Date(selectedYear, selectedMonth, parseInt(day)) <
                    new Date(new Date().setHours(0, 0, 0, 0));

                  return (
                    <div key={day} className="bg-white rounded-lg shadow">
                      <div
                        className={`px-6 py-3 border-l-4 ${
                          isPast
                            ? 'bg-red-50 border-red-500'
                            : 'bg-blue-50 border-blue-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">
                              {new Date(
                                selectedYear,
                                selectedMonth,
                                parseInt(day)
                              ).toLocaleDateString('en-US', {
                                weekday: 'long',
                              })}
                            </p>
                            <p className="text-xl font-bold text-gray-900">
                              {parseInt(day)} {monthNames[selectedMonth]}
                            </p>
                          </div>
                          <div className="text-right">
                            {dayIncome > 0 && (
                              <div className="mb-2">
                                <p className="text-xs font-medium text-gray-500">
                                  Income
                                </p>
                                <p className="text-lg font-bold text-green-600">
                                  {formatCurrency(dayIncome)}
                                </p>
                              </div>
                            )}
                            {dayBillsTotal > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-500">
                                  Bills
                                </p>
                                <p
                                  className={`text-lg font-bold ${
                                    isPast ? 'text-red-600' : 'text-blue-600'
                                  }`}
                                >
                                  {formatCurrency(dayBillsTotal)}
                                </p>
                              </div>
                            )}
                            {dayIncome === 0 && dayBillsTotal === 0 && (
                              <p className="text-sm text-gray-400">₱0.00</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="px-6 py-4 space-y-3">
                        {dayBills.map((bill, index) => (
                          <div
                            key={`${bill.type}-${bill.id}-${index}`}
                            className={`flex items-center justify-between py-3 border-b border-gray-100 last:border-0 ${
                              bill.isPaid ? 'opacity-60' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {bill.type === 'liability' && (
                                <input
                                  type="checkbox"
                                  checked={bill.isPaid}
                                  disabled={bill.isPaid}
                                  onChange={() =>
                                    handleTogglePaid(
                                      bill,
                                      selectedYear,
                                      selectedMonth
                                    )
                                  }
                                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4
                                    className={`font-medium ${
                                      bill.isPaid
                                        ? 'text-gray-500 line-through'
                                        : 'text-gray-900'
                                    }`}
                                  >
                                    {bill.name}
                                  </h4>
                                  <span
                                    className={`px-2 py-1 text-xs font-medium rounded ${
                                      bill.type === 'expense'
                                        ? 'bg-green-100 text-green-800'
                                        : bill.type === 'income'
                                        ? 'bg-green-100 text-green-800'
                                        : getCategoryColor(
                                            bill.type,
                                            bill.category,
                                            bill.payment_type
                                          )
                                    }`}
                                  >
                                    {bill.type === 'expense'
                                      ? 'Recurring Expense'
                                      : getCategoryLabel(
                                          bill.type,
                                          bill.category,
                                          bill.payment_type,
                                          bill.liability,
                                          selectedYear,
                                          selectedMonth
                                        )}
                                  </span>
                                </div>
                                {bill.source && (
                                  <p className="text-sm text-gray-500">
                                    {bill.source}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p
                                className={`text-lg font-semibold ${
                                  bill.isPaid
                                    ? 'text-gray-400 line-through'
                                    : 'text-gray-900'
                                }`}
                              >
                                {formatCurrency(bill.amount)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </>
      ) : (
        /* List View */
        <div className="space-y-6">
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
                  // Only count expenses/bills (not income)
                  if (bill.type === 'income') return false;
                  // When paidFilter is 'all', exclude paid bills from total
                  if (paidFilter === 'all') {
                    return !bill.isPaid;
                  }
                  return true;
                })
                .reduce((sum, bill) => sum + bill.amount, 0);
              const isCurrentMonth =
                year === new Date().getFullYear() &&
                month === new Date().getMonth();
              const isPastMonth =
                new Date(year, month, 1) <
                new Date(new Date().getFullYear(), new Date().getMonth(), 1);

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
                <div key={monthKey} className="bg-white rounded-lg shadow">
                  <div
                    className={`px-6 py-4 border-l-4 ${
                      isPastMonth
                        ? 'bg-gray-50 border-gray-400'
                        : isCurrentMonth
                        ? 'bg-indigo-50 border-indigo-500'
                        : 'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {monthNames[month]} {year}
                        </h3>
                        {isCurrentMonth && (
                          <p className="text-sm text-indigo-600 mt-1">
                            Current Month
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {monthIncome > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-gray-500">
                              Income
                            </p>
                            <p className="text-xl font-bold text-green-600">
                              {formatCurrency(monthIncome)}
                            </p>
                          </div>
                        )}
                        {monthBillsTotal > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500">
                              Bills
                            </p>
                            <p
                              className={`text-xl font-bold ${
                                isPastMonth
                                  ? 'text-gray-600'
                                  : isCurrentMonth
                                  ? 'text-indigo-600'
                                  : 'text-blue-600'
                              }`}
                            >
                              {formatCurrency(monthBillsTotal)}
                            </p>
                          </div>
                        )}
                        {monthIncome === 0 && monthBillsTotal === 0 && (
                          <p className="text-sm text-gray-400">₱0.00</p>
                        )}
                        <p className="text-sm text-gray-500 mt-2">
                          {monthBills.length}{' '}
                          {monthBills.length === 1
                            ? 'transaction'
                            : 'transactions'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 space-y-4">
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
                            // Only count expenses/bills (not income)
                            if (bill.type === 'income') return false;
                            // When paidFilter is 'all', exclude paid bills from total
                            if (paidFilter === 'all') {
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
                            className="border-l-2 border-gray-200 pl-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-sm font-medium text-gray-600">
                                  {dayDate.toLocaleDateString('en-US', {
                                    weekday: 'short',
                                  })}
                                </p>
                                <p
                                  className={`text-lg font-semibold ${
                                    isPast ? 'text-gray-500' : 'text-gray-900'
                                  }`}
                                >
                                  {parseInt(day)} {monthNames[month]}
                                </p>
                              </div>
                              <div className="text-right">
                                {dayIncome > 0 && (
                                  <p className="text-sm font-semibold text-green-600">
                                    +{formatCurrency(dayIncome)}
                                  </p>
                                )}
                                {dayBillsTotal > 0 && (
                                  <p
                                    className={`text-sm font-semibold ${
                                      isPast ? 'text-gray-500' : 'text-red-600'
                                    }`}
                                  >
                                    -{formatCurrency(dayBillsTotal)}
                                  </p>
                                )}
                                {dayIncome === 0 && dayBillsTotal === 0 && (
                                  <p className="text-sm text-gray-400">₱0.00</p>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              {dayBills.map((bill, index) => (
                                <div
                                  key={`${bill.type}-${bill.id}-${index}`}
                                  className={`flex items-center justify-between py-2 pl-2 border-l-2 border-gray-100 ${
                                    bill.isPaid ? 'opacity-60' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    {bill.type === 'liability' && (
                                      <input
                                        type="checkbox"
                                        checked={bill.isPaid}
                                        disabled={bill.isPaid}
                                        onChange={() =>
                                          handleTogglePaid(bill, year, month)
                                        }
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                      />
                                    )}
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <h4
                                          className={`text-sm font-medium ${
                                            bill.isPaid
                                              ? 'text-gray-500 line-through'
                                              : 'text-gray-900'
                                          }`}
                                        >
                                          {bill.name}
                                        </h4>
                                        <span
                                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                                            bill.type === 'expense'
                                              ? 'bg-green-100 text-green-800'
                                              : bill.type === 'income'
                                              ? 'bg-green-100 text-green-800'
                                              : getCategoryColor(
                                                  bill.type,
                                                  bill.category,
                                                  bill.payment_type
                                                )
                                          }`}
                                        >
                                          {bill.type === 'expense'
                                            ? 'Recurring Expense'
                                            : getCategoryLabel(
                                                bill.type,
                                                bill.category,
                                                bill.payment_type,
                                                bill.liability,
                                                year,
                                                month
                                              )}
                                        </span>
                                      </div>
                                      {bill.source && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                          {bill.source}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <p
                                    className={`text-sm font-semibold ${
                                      bill.isPaid
                                        ? 'text-gray-400 line-through'
                                        : 'text-gray-900'
                                    }`}
                                  >
                                    {formatCurrency(bill.amount)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}

          {Object.keys(billsByMonth).filter(
            (monthKey) => billsByMonth[monthKey].length > 0
          ).length === 0 && (
            <div className="bg-white p-12 rounded-lg shadow text-center">
              <p className="text-gray-500 text-lg">
                No upcoming bills in the next 12 months
              </p>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={pendingBill !== null}
        onClose={handleCancelPaid}
        title="Mark Bill as Paid"
      >
        {pendingBill && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Confirm Payment
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Are you sure you want to mark this bill as paid? This will
                      create an expense record with today's date.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-md p-4">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Bill Name
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {pendingBill.bill.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Amount</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatCurrency(pendingBill.bill.amount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Due Month
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {monthNames[pendingBill.month]} {pendingBill.year}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Payment Date
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleCancelPaid}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPaid}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
