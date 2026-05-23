const { addDays, isToday, isTomorrow, startOfDay } = require('date-fns');

const baseDate = startOfDay(new Date());
const nextDue = addDays(baseDate, 1);
console.log("baseDate", baseDate);
console.log("nextDue", nextDue);
console.log("baseDate isToday:", isToday(baseDate));
console.log("nextDue isTomorrow:", isTomorrow(nextDue));
console.log("nextDue isToday:", isToday(nextDue));
