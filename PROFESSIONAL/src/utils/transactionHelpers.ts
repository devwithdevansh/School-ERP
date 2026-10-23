export function formatTransactions(rawTransactions: any[], students: any[]) {
  const mappedStudentsMap = new Map<string, any>(students.map((s: any) => [s._id || s.id, s]));

  const getFeeTypeFormatted = (ledger: any) => {
    if (!ledger) return 'General Fee';
    const type = ledger.feeType;
    let formatted = type;
    if (type === 'EDUCATION') formatted = 'Education';
    else if (type === 'TRANSPORT') formatted = 'Transport';
    else if (type === 'TERM') formatted = 'Term';
    else if (type === 'ADMISSION') formatted = 'Admission';
    else if (type === 'BAG_KIT') formatted = 'Bag & Kit';
    else formatted = type.charAt(0) + type.slice(1).toLowerCase();
    return `${formatted} Fee - ${ledger.feePeriod}`;
  };

  const groupedTxns = new Map<string, any[]>();
  rawTransactions.forEach((tx: any) => {
    const groupId = tx.details?.transactionId || tx._id;
    if (!groupedTxns.has(groupId)) {
      groupedTxns.set(groupId, []);
    }
    groupedTxns.get(groupId)!.push(tx);
  });

  const reversedIds = new Set(
    rawTransactions
      .filter((tx: any) => tx.isReversal && tx.details?.reversalOf)
      .map((tx: any) => String(tx.details.reversalOf))
  );

  const mappedTransactions: any[] = [];
  groupedTxns.forEach((txGroup, groupId) => {
    let totalAmount = 0;
    let totalConcession = 0;
    const subItems: any[] = [];
    const feeTypes: string[] = [];
    const reversalIds: string[] = [];

    let firstTx = txGroup[0];
    let student: any = null;
    let groupReceiptNumber: number | undefined = undefined;

    txGroup.forEach((tx: any) => {
      totalAmount += tx.amount || 0;
      totalConcession += tx.concessionAmount || 0;
      reversalIds.push(tx._id);

      if (tx.receiptNumber !== undefined) {
        groupReceiptNumber = tx.receiptNumber;
      }

      const ledger = tx.ledger;
      if (!student && ledger) {
        student = mappedStudentsMap.get(ledger.studentId);
      }
      const desc = getFeeTypeFormatted(ledger);
      feeTypes.push(desc);

      const isReversed = tx.isReversal || reversedIds.has(tx._id?.toString()) || reversedIds.has(tx.id?.toString());
      const status = isReversed ? 'REVERSED' : (ledger?.status || 'PAID');

      subItems.push({
        ...tx,
        id: tx._id,
        date: tx.createdAt ? new Date(tx.createdAt).toISOString().split('T')[0] : '',
        ledgerId: tx.ledgerId,
        studentId: ledger?.studentId,
        studentName: student?.name || student?.studentName || 'Unknown Student',
        method: tx.method,
        status,
        feeType: desc,
        description: desc,
        academicYear: ledger ? ledger.academicYear : undefined
      });
    });

    const breakdownMap = new Map<string, number>();
    txGroup.forEach((tx: any) => {
      if (tx.method) {
        breakdownMap.set(tx.method, (breakdownMap.get(tx.method) || 0) + (tx.amount || 0));
      }
    });
    const paymentBreakdown = Array.from(breakdownMap.entries()).map(([method, amount]) => ({ method, amount }));
    const uniqueMethods = Array.from(breakdownMap.keys());
    const joinedMethod = uniqueMethods.join(' + ');

    const groupIsReversal = firstTx.isReversal || txGroup.every(tx => reversedIds.has(tx._id?.toString()) || reversedIds.has(tx.id?.toString()));
    const groupIsPartiallyReversed = !groupIsReversal && txGroup.some(tx => reversedIds.has(tx._id?.toString()) || reversedIds.has(tx.id?.toString()));
    const primaryLedger = firstTx.ledger;
    const status = groupIsReversal ? 'REVERSED' : groupIsPartiallyReversed ? 'PARTIALLY_REVERSED' : (primaryLedger?.status || 'PAID');

    const primaryAcademicYear = subItems.length > 0 ? subItems[0].academicYear : undefined;

    let studentName = 'Unknown';
    let studentCode = 'N/A';
    let classInfo = 'N/A';
    let isDeleted = false;

    if (student) {
      studentName = student.name || student.studentName || 'Unknown';
      studentCode = student.studentCode || 'N/A';
      isDeleted = student.isActive === false;
      const std = primaryLedger?.snapshot?.standard || student.standard;
      const div = primaryLedger?.snapshot?.division || student.division;
      const med = primaryLedger?.snapshot?.medium || student.medium;
      classInfo = `${std} - ${div} ${med}`;
    } else if (primaryLedger && primaryLedger.snapshot) {
      studentName = primaryLedger.snapshot.studentName || 'Unknown';
      studentCode = 'N/A'; 
      const std = primaryLedger.snapshot.standard || 'N/A';
      const div = primaryLedger.snapshot.division || 'N/A';
      const med = primaryLedger.snapshot.medium || 'N/A';
      classInfo = `${std} - ${div} ${med}`;
      isDeleted = true;
    }

    mappedTransactions.push({
      id: groupId,
      studentId: student ? student.id : (primaryLedger?.studentId || ''),
      studentName: studentName,
      studentCode: studentCode,
      classInfo: classInfo,
      feeType: feeTypes.join('\n'),
      amount: totalAmount,
      concessionAmount: totalConcession,
      method: joinedMethod || firstTx.method || 'N/A',
      time: firstTx.createdAt ? new Date(firstTx.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
      status: status,
      date: firstTx.createdAt ? firstTx.createdAt.split('T')[0] : '',
      remark: firstTx.details?.remark || firstTx.details?.reason || '',
      subItems: subItems,
      reversalIds: reversalIds.join(','),
      isReversal: !!firstTx.isReversal,
      paymentBreakdown: paymentBreakdown,
      academicYear: primaryAcademicYear,
      isDeleted: isDeleted,
      receiptNumber: groupReceiptNumber,
      performedBy: firstTx.performedBy,
      gatewayTransactionId: firstTx.gatewayTransactionId,
      gatewayLog: firstTx.gatewayLog
    });
  });

  mappedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return mappedTransactions;
}
