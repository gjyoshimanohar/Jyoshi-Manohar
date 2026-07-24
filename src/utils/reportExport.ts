import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { Todo, Project } from "../types";

export interface ReportSummaryMetrics {
  totalCreated: number;
  totalCompleted: number;
  totalPending: number;
  completionRate: number;
  dateRangeText: string;
}

function formatPriorityLabel(p?: number): string {
  if (p === 1) return "URGENT";
  if (p === 2) return "HIGH";
  if (p === 3) return "MEDIUM";
  if (p === 4) return "LOW";
  return "NORMAL";
}

/**
 * Export report as a styled PDF file
 */
export function exportReportToPDF({
  summary,
  tasks,
  projects,
}: {
  summary: ReportSummaryMetrics;
  tasks: Todo[];
  projects: Project[];
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const getProjectName = (projectId?: string | null) => {
    if (!projectId) return "General";
    const proj = projects.find((p) => p.id === projectId);
    return proj ? proj.name : "General";
  };

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 210, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("WORKFLOW TRENDS & ANALYTICS REPORT", 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(226, 232, 240);
  doc.text(`Generated on: ${format(new Date(), "PPpp")}  |  Period: ${summary.dateRangeText}`, 14, 24);

  // Executive Summary Section
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("EXECUTIVE SUMMARY", 14, 42);

  // Summary Metrics Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 46, 182, 24, 3, 3, "FD");

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);

  // Column 1: Total Created
  doc.text("TOTAL CREATED", 20, 52);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(String(summary.totalCreated), 20, 62);

  // Column 2: Completed
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("COMPLETED", 68, 52);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(String(summary.totalCompleted), 68, 62);

  // Column 3: Pending
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("PENDING LOAD", 116, 52);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(217, 119, 6); // Amber
  doc.text(String(summary.totalPending), 116, 62);

  // Column 4: Completion Rate
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("COMPLETION RATE", 158, 52);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229); // Indigo
  doc.text(`${summary.completionRate}%`, 158, 62);

  // Tasks Detail Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("DETAILED TASK BREAKDOWN", 14, 78);

  const tableRows = tasks.map((t, idx) => [
    idx + 1,
    t.title,
    getProjectName(t.projectId),
    formatPriorityLabel(t.priority),
    t.completed ? "Completed" : "Pending",
    t.createdAt ? format(new Date(t.createdAt), "yyyy-MM-dd") : "-",
    t.dueDate ? format(new Date(t.dueDate), "yyyy-MM-dd") : "-",
  ]);

  autoTable(doc, {
    startY: 82,
    head: [["#", "Task Title", "Project", "Priority", "Status", "Created Date", "Due Date"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [79, 70, 229], // Indigo 600
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 60 },
      2: { cellWidth: 32 },
      3: { cellWidth: 20 },
      4: { cellWidth: 22 },
      5: { cellWidth: 23 },
      6: { cellWidth: 23 },
    },
    margin: { left: 14, right: 14 },
  });

  const fileName = `Trends_Report_${summary.dateRangeText.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  doc.save(fileName);
}

/**
 * Export report as a multi-sheet Excel (.xlsx) file
 */
export function exportReportToExcel({
  summary,
  tasks,
  projects,
}: {
  summary: ReportSummaryMetrics;
  tasks: Todo[];
  projects: Project[];
}) {
  const getProjectName = (projectId?: string | null) => {
    if (!projectId) return "General";
    const proj = projects.find((p) => p.id === projectId);
    return proj ? proj.name : "General";
  };

  // Sheet 1: Summary KPI Metrics
  const summaryData = [
    { Metric: "Report Title", Value: "Workflow Trends & Analytics Report" },
    { Metric: "Date Period", Value: summary.dateRangeText },
    { Metric: "Generated Date", Value: format(new Date(), "yyyy-MM-dd HH:mm:ss") },
    { Metric: "Total Tasks Created", Value: summary.totalCreated },
    { Metric: "Total Completed Tasks", Value: summary.totalCompleted },
    { Metric: "Total Pending Tasks", Value: summary.totalPending },
    { Metric: "Overall Completion Rate", Value: `${summary.completionRate}%` },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 25 }, { wch: 40 }];

  // Sheet 2: Task Records
  const taskRecords = tasks.map((t, idx) => ({
    "No.": idx + 1,
    "Task ID": t.id,
    "Title": t.title,
    "Project": getProjectName(t.projectId),
    "Priority": formatPriorityLabel(t.priority),
    "Status": t.completed ? "Completed" : "Pending",
    "Created Date": t.createdAt ? format(new Date(t.createdAt), "yyyy-MM-dd HH:mm") : "",
    "Due Date": t.dueDate ? format(new Date(t.dueDate), "yyyy-MM-dd") : "",
    "Completed Date": t.completedAt ? format(new Date(t.completedAt), "yyyy-MM-dd HH:mm") : "",
    "Overdue": !t.completed && t.dueDate && new Date(t.dueDate).getTime() < Date.now() ? "Yes" : "No",
  }));

  const tasksSheet = XLSX.utils.json_to_sheet(taskRecords);
  tasksSheet["!cols"] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 40 },
    { wch: 20 },
    { wch: 12 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 10 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary KPI");
  XLSX.utils.book_append_sheet(workbook, tasksSheet, "Task Breakdown");

  const fileName = `Trends_Report_${summary.dateRangeText.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export interface TimesheetReportExportItem {
  id: string;
  type: string;
  title: string;
  category: string;
  durationFormatted: string;
  durationSeconds: number;
  dateStr: string;
  statusText: string;
}

/**
 * Export Timesheet Report as PDF
 */
export function exportTimesheetsToPDF({
  dateRangeText,
  totalDurationFormatted,
  items,
}: {
  dateRangeText: string;
  totalDurationFormatted: string;
  items: TimesheetReportExportItem[];
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Header Banner
  doc.setFillColor(26, 43, 88); // #1a2b58
  doc.rect(0, 0, 210, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("TIMESHEET & TIME TRACKING REPORT", 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(226, 232, 240);
  doc.text(`Generated: ${format(new Date(), "PPpp")}  |  Period: ${dateRangeText}`, 14, 24);

  // Summary KPI Block
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TIME SUMMARY", 14, 42);

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 46, 182, 22, 3, 3, "FD");

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);

  doc.text("TOTAL TIME TRACKED", 20, 52);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(26, 43, 88);
  doc.text(totalDurationFormatted, 20, 61);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("TOTAL LOGGED RECORDS", 110, 52);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`${items.length} items`, 110, 61);

  // Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("TIMESHEET & TASK TIMER ENTRIES", 14, 76);

  const tableRows = items.map((item, idx) => [
    idx + 1,
    item.title,
    item.category,
    item.type,
    item.dateStr,
    item.durationFormatted,
    item.statusText,
  ]);

  autoTable(doc, {
    startY: 80,
    head: [["#", "Task / Description", "Client / Project", "Type", "Date", "Duration", "Status"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [26, 43, 88],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 60 },
      2: { cellWidth: 32 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 20 },
      6: { cellWidth: 18 },
    },
    margin: { left: 14, right: 14 },
  });

  const fileName = `Timesheet_Report_${dateRangeText.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  doc.save(fileName);
}

/**
 * Export Timesheet Report as Excel (.xlsx)
 */
export function exportTimesheetsToExcel({
  dateRangeText,
  totalDurationFormatted,
  items,
}: {
  dateRangeText: string;
  totalDurationFormatted: string;
  items: TimesheetReportExportItem[];
}) {
  const summaryData = [
    { Metric: "Report Title", Value: "Integrated Timesheet & Time Tracking Report" },
    { Metric: "Date Period", Value: dateRangeText },
    { Metric: "Generated Date", Value: format(new Date(), "yyyy-MM-dd HH:mm:ss") },
    { Metric: "Total Time Tracked", Value: totalDurationFormatted },
    { Metric: "Total Logged Items", Value: items.length },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 25 }, { wch: 45 }];

  const records = items.map((item, idx) => ({
    "No.": idx + 1,
    "Task / Description": item.title,
    "Client / Project": item.category,
    "Tracking Type": item.type,
    "Date": item.dateStr,
    "Duration": item.durationFormatted,
    "Duration (Seconds)": item.durationSeconds,
    "Status": item.statusText,
  }));

  const recordsSheet = XLSX.utils.json_to_sheet(records);
  recordsSheet["!cols"] = [
    { wch: 6 },
    { wch: 40 },
    { wch: 25 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 15 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary KPI");
  XLSX.utils.book_append_sheet(workbook, recordsSheet, "Timesheet Log");

  const fileName = `Timesheet_Report_${dateRangeText.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

