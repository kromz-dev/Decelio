import { dailyScanJob } from "./functions/daily-scan";
import { scanSiteJob } from "./functions/scan-site";
import { pruneScanLogsJob } from "./functions/prune-scan-logs";
import { discoveryEmailDispatcher, discoveryEmailSender } from "./functions/discovery-email";
import { purgeCancelledAccountsJob } from "./functions/purge-cancelled-accounts";
import { monthlyReportDispatcher, monthlyReportGenerator } from "./functions/monthly-report";

export const functions = [
  dailyScanJob,
  scanSiteJob,
  pruneScanLogsJob,
  discoveryEmailDispatcher,
  discoveryEmailSender,
  purgeCancelledAccountsJob,
  monthlyReportDispatcher,
  monthlyReportGenerator,
];
