export type TaskAssignment = {
  type: "role" | "department" | "unassigned";
  value: string | null;
};

export type TaskAssigneeTypeValue = "EMPLOYEE" | "ORG_USER";

export type DefaultTask = {
  name: string;
  description: string;
  category: string;
  order: number;
  defaultDueDays: number;
  isRequired?: boolean;
  requiresApproval?: boolean;
  isHighRiskTask?: boolean;
  isEmployeeRequired?: boolean;
  assigneeType?: TaskAssigneeTypeValue;
  assigneeRole?: string;
  assigneeDepartment?: string;
  evidenceRequirement?: "REQUIRED" | "OPTIONAL" | "NONE";
};

export type DefaultWorkflowTemplate = {
  name: string;
  description: string;
  riskLevel: "LOW" | "HIGH" | "CRITICAL";
  isDefault?: boolean;
  tasks: DefaultTask[];
};

export const STANDARD_RESIGNATION_TASKS: DefaultTask[] = [
  { name: "Acknowledge resignation", description: "HR acknowledges and documents the resignation notice", category: "HR", order: 1, defaultDueDays: 0, isRequired: true, assigneeType: "ORG_USER", assigneeDepartment: "HR" },
  { name: "Schedule exit interview", description: "Schedule and conduct exit interview with departing employee", category: "HR", order: 2, defaultDueDays: -7, isRequired: false, assigneeType: "ORG_USER", assigneeDepartment: "HR" },
  { name: "Complete exit interview", description: "Attend exit interview and provide feedback", category: "HR", order: 3, defaultDueDays: -5, isRequired: false, isEmployeeRequired: true, assigneeType: "EMPLOYEE" },
  { name: "Knowledge transfer planning", description: "Identify critical knowledge and plan transfer to team members", category: "HR", order: 4, defaultDueDays: -14, isRequired: true, assigneeType: "ORG_USER", assigneeRole: "MANAGER" },
  { name: "Complete knowledge handover", description: "Execute knowledge transfer sessions and document key information", category: "HR", order: 5, defaultDueDays: -7, isRequired: true, assigneeType: "ORG_USER", assigneeRole: "MANAGER" },
  { name: "Return company laptop", description: "Prepare and return your company laptop with all data backed up", category: "ASSETS", order: 6, defaultDueDays: 0, isRequired: true, isEmployeeRequired: true, assigneeType: "EMPLOYEE", evidenceRequirement: "REQUIRED" },
  { name: "Return company phone", description: "Return company mobile device and accessories", category: "ASSETS", order: 7, defaultDueDays: 0, isRequired: false, isEmployeeRequired: true, assigneeType: "EMPLOYEE", evidenceRequirement: "OPTIONAL" },
  { name: "Return access badges and keys", description: "Return all building access cards and physical keys", category: "SECURITY", order: 8, defaultDueDays: 0, isRequired: true, isEmployeeRequired: true, assigneeType: "EMPLOYEE", evidenceRequirement: "REQUIRED" },
  { name: "Sign NDA acknowledgment", description: "Acknowledge and sign confidentiality and NDA obligations", category: "LEGAL", order: 9, defaultDueDays: 0, isRequired: true, isEmployeeRequired: true, assigneeType: "EMPLOYEE", evidenceRequirement: "REQUIRED" },
  { name: "Revoke email access", description: "Disable corporate email account and configure forwarding", category: "IT", order: 10, defaultDueDays: 0, isRequired: true, isHighRiskTask: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Revoke Slack/Teams access", description: "Remove from communication platforms", category: "IT", order: 11, defaultDueDays: 0, isRequired: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Revoke application access", description: "Remove access to company applications and SaaS tools", category: "IT", order: 12, defaultDueDays: 0, isRequired: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Verify laptop collected", description: "Verify laptop, charger, and peripherals have been collected", category: "ASSETS", order: 13, defaultDueDays: 0, isRequired: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Verify phone collected", description: "Verify mobile device and accessories have been collected", category: "ASSETS", order: 14, defaultDueDays: 0, isRequired: false, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Verify badges collected", description: "Verify building access cards and keys have been collected", category: "SECURITY", order: 15, defaultDueDays: 0, isRequired: true, assigneeType: "ORG_USER", assigneeDepartment: "Security" },
  { name: "Remove building access", description: "Deactivate badge in physical security system", category: "SECURITY", order: 16, defaultDueDays: 0, isRequired: true, assigneeType: "ORG_USER", assigneeDepartment: "Security" },
  { name: "Process final paycheck", description: "Calculate final pay including unused PTO", category: "FINANCE", order: 17, defaultDueDays: 3, isRequired: true, requiresApproval: true, assigneeType: "ORG_USER", assigneeDepartment: "Finance" },
  { name: "Terminate benefits", description: "Process benefits termination and COBRA notifications", category: "FINANCE", order: 18, defaultDueDays: 7, isRequired: true, assigneeType: "ORG_USER", assigneeDepartment: "HR" },
  { name: "Archive user data", description: "Backup and archive employee files and emails per retention policy", category: "IT", order: 19, defaultDueDays: 14, isRequired: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
];

export const TERMINATION_HIGH_RISK_TASKS: DefaultTask[] = [
  { name: "Immediate access revocation", description: "Immediately revoke all system access upon termination decision", category: "SECURITY", order: 1, defaultDueDays: 0, isRequired: true, isHighRiskTask: true, requiresApproval: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Security escort", description: "Coordinate security escort for employee to collect personal belongings", category: "SECURITY", order: 2, defaultDueDays: 0, isRequired: true, isHighRiskTask: true, assigneeType: "ORG_USER", assigneeDepartment: "Security" },
  { name: "Disable all accounts", description: "Disable AD, email, VPN, and all application accounts", category: "IT", order: 3, defaultDueDays: 0, isRequired: true, isHighRiskTask: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Revoke VPN and remote access", description: "Terminate VPN certificates and remote desktop access", category: "IT", order: 4, defaultDueDays: 0, isRequired: true, isHighRiskTask: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Audit recent activity", description: "Review access logs and recent file activity for security concerns", category: "SECURITY", order: 5, defaultDueDays: 1, isRequired: true, isHighRiskTask: true, assigneeType: "ORG_USER", assigneeDepartment: "Security" },
  { name: "Legal hold assessment", description: "Determine if legal hold applies to employee data and communications", category: "LEGAL", order: 6, defaultDueDays: 1, isRequired: true, requiresApproval: true, assigneeType: "ORG_USER", assigneeDepartment: "Legal" },
  { name: "NDA reminder notification", description: "Send formal reminder of confidentiality and NDA obligations", category: "LEGAL", order: 7, defaultDueDays: 0, isRequired: true, assigneeType: "ORG_USER", assigneeDepartment: "Legal" },
  { name: "Collect all company property", description: "Retrieve all company assets including laptop, phone, badges, keys", category: "ASSETS", order: 8, defaultDueDays: 0, isRequired: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Remove building access", description: "Immediately deactivate physical access credentials", category: "SECURITY", order: 9, defaultDueDays: 0, isRequired: true, isHighRiskTask: true, assigneeType: "ORG_USER", assigneeDepartment: "Security" },
  { name: "Notify relevant stakeholders", description: "Inform direct team and key stakeholders of departure", category: "HR", order: 10, defaultDueDays: 1, isRequired: true, assigneeType: "ORG_USER", assigneeRole: "MANAGER" },
  { name: "Transfer critical responsibilities", description: "Reassign critical tasks and responsibilities to remaining team", category: "HR", order: 11, defaultDueDays: 1, isRequired: true, assigneeType: "ORG_USER", assigneeRole: "MANAGER" },
  { name: "Process final compensation", description: "Calculate and process final paycheck per legal requirements", category: "FINANCE", order: 12, defaultDueDays: 3, isRequired: true, requiresApproval: true, assigneeType: "ORG_USER", assigneeDepartment: "Finance" },
  { name: "Terminate benefits immediately", description: "Process immediate benefits termination", category: "FINANCE", order: 13, defaultDueDays: 1, isRequired: true, assigneeType: "ORG_USER", assigneeDepartment: "HR" },
  { name: "Document termination", description: "Complete all termination documentation for HR records", category: "HR", order: 14, defaultDueDays: 3, isRequired: true, requiresApproval: true, assigneeType: "ORG_USER", assigneeDepartment: "HR" },
];

export const PRIVILEGED_ACCESS_TASKS: DefaultTask[] = [
  { name: "Revoke admin credentials", description: "Immediately disable all administrative and privileged accounts", category: "SECURITY", order: 1, defaultDueDays: 0, isRequired: true, isHighRiskTask: true, requiresApproval: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Rotate shared secrets", description: "Rotate all shared passwords, API keys, and secrets the employee had access to", category: "SECURITY", order: 2, defaultDueDays: 0, isRequired: true, isHighRiskTask: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Revoke cloud console access", description: "Remove AWS, GCP, Azure admin access and IAM permissions", category: "IT", order: 3, defaultDueDays: 0, isRequired: true, isHighRiskTask: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Revoke source code access", description: "Remove GitHub, GitLab, Bitbucket organization access", category: "IT", order: 4, defaultDueDays: 0, isRequired: true, isHighRiskTask: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Revoke database access", description: "Remove direct database access and credentials", category: "IT", order: 5, defaultDueDays: 0, isRequired: true, isHighRiskTask: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Revoke CI/CD access", description: "Remove access to deployment pipelines and automation tools", category: "IT", order: 6, defaultDueDays: 0, isRequired: true, isHighRiskTask: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Audit infrastructure changes", description: "Review recent infrastructure and configuration changes", category: "SECURITY", order: 7, defaultDueDays: 1, isRequired: true, isHighRiskTask: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Review access logs", description: "Analyze authentication and authorization logs for anomalies", category: "SECURITY", order: 8, defaultDueDays: 1, isRequired: true, isHighRiskTask: true, assigneeType: "ORG_USER", assigneeDepartment: "Security" },
  { name: "Remove SSH keys", description: "Remove SSH public keys from all servers and services", category: "IT", order: 9, defaultDueDays: 0, isRequired: true, isHighRiskTask: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Disable VPN certificates", description: "Revoke VPN certificates and remove from allowed lists", category: "IT", order: 10, defaultDueDays: 0, isRequired: true, isHighRiskTask: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Transfer code ownership", description: "Reassign code ownership and merge request approvals", category: "IT", order: 11, defaultDueDays: 3, isRequired: true, assigneeType: "ORG_USER", assigneeRole: "MANAGER" },
  { name: "Document system access", description: "Document all systems and access levels for audit trail", category: "IT", order: 12, defaultDueDays: 3, isRequired: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Knowledge transfer - technical", description: "Complete technical knowledge transfer for maintained systems", category: "IT", order: 13, defaultDueDays: -7, isRequired: true, assigneeType: "ORG_USER", assigneeRole: "MANAGER" },
  { name: "Collect equipment", description: "Retrieve all equipment including development machines", category: "ASSETS", order: 14, defaultDueDays: 0, isRequired: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Final security review", description: "Complete security checklist and sign-off", category: "SECURITY", order: 15, defaultDueDays: 3, isRequired: true, requiresApproval: true, assigneeType: "ORG_USER", assigneeDepartment: "Security" },
];

export const CONTRACTOR_OFFBOARDING_TASKS: DefaultTask[] = [
  { name: "Verify contract end date", description: "Confirm contract termination date and terms", category: "HR", order: 1, defaultDueDays: -14, isRequired: true, assigneeType: "ORG_USER", assigneeDepartment: "HR" },
  { name: "Review deliverables", description: "Ensure all contracted deliverables are completed or handed over", category: "HR", order: 2, defaultDueDays: -7, isRequired: true, assigneeType: "ORG_USER", assigneeRole: "MANAGER" },
  { name: "Submit final work product", description: "Submit all work product, documentation, and code", category: "HR", order: 3, defaultDueDays: -3, isRequired: true, isEmployeeRequired: true, assigneeType: "EMPLOYEE", evidenceRequirement: "REQUIRED" },
  { name: "Revoke system access", description: "Remove access to all company systems and applications", category: "IT", order: 4, defaultDueDays: 0, isRequired: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Revoke email access", description: "Disable contractor email account", category: "IT", order: 5, defaultDueDays: 0, isRequired: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Remove from communication tools", description: "Remove from Slack, Teams, and collaboration tools", category: "IT", order: 6, defaultDueDays: 0, isRequired: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Return company equipment", description: "Return any company-provided equipment", category: "ASSETS", order: 7, defaultDueDays: 0, isRequired: false, isEmployeeRequired: true, assigneeType: "EMPLOYEE", evidenceRequirement: "OPTIONAL" },
  { name: "Verify equipment returned", description: "Verify company equipment has been returned", category: "ASSETS", order: 8, defaultDueDays: 0, isRequired: false, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "Remove building access", description: "Deactivate physical access if applicable", category: "SECURITY", order: 9, defaultDueDays: 0, isRequired: true, assigneeType: "ORG_USER", assigneeDepartment: "Security" },
  { name: "Process final invoice", description: "Verify and process final contractor invoice", category: "FINANCE", order: 10, defaultDueDays: 7, isRequired: true, requiresApproval: true, assigneeType: "ORG_USER", assigneeDepartment: "Finance" },
  { name: "Archive contractor files", description: "Archive work files and documentation", category: "IT", order: 11, defaultDueDays: 7, isRequired: true, assigneeType: "ORG_USER", assigneeDepartment: "IT" },
  { name: "NDA confirmation", description: "Send confidentiality obligations reminder", category: "LEGAL", order: 12, defaultDueDays: 0, isRequired: false, assigneeType: "ORG_USER", assigneeDepartment: "Legal" },
  { name: "Close contractor record", description: "Update contractor status in HR systems", category: "HR", order: 13, defaultDueDays: 3, isRequired: true, assigneeType: "ORG_USER", assigneeDepartment: "HR" },
];

export const DEFAULT_WORKFLOW_TEMPLATES: DefaultWorkflowTemplate[] = [
  {
    name: "Standard Resignation",
    description: "Standard workflow for voluntary employee resignations. Low-risk process with standard notice period tasks.",
    riskLevel: "LOW",
    isDefault: true,
    tasks: STANDARD_RESIGNATION_TASKS,
  },
  {
    name: "Involuntary Termination",
    description: "High-security workflow for involuntary terminations. Includes immediate access revocation, security escort, and legal review.",
    riskLevel: "HIGH",
    tasks: TERMINATION_HIGH_RISK_TASKS,
  },
  {
    name: "Privileged Access Offboarding",
    description: "Critical security workflow for employees with administrative or developer access. Includes credential rotation and security audit.",
    riskLevel: "CRITICAL",
    tasks: PRIVILEGED_ACCESS_TASKS,
  },
  {
    name: "Contractor End of Engagement",
    description: "Workflow for contractor and temporary worker offboarding. Focused on deliverable handover and system access removal.",
    riskLevel: "LOW",
    tasks: CONTRACTOR_OFFBOARDING_TASKS,
  },
];

export const DEFAULT_WORKFLOW_TASKS = STANDARD_RESIGNATION_TASKS;

export const HIGH_RISK_ADDITIONAL_TASKS: DefaultTask[] = [
  { name: "Immediate access revocation", description: "Revoke all system access immediately upon notification", category: "SECURITY", order: 0, defaultDueDays: 0, isHighRiskTask: true, requiresApproval: true, assigneeType: "ORG_USER" },
  { name: "Security review", description: "Review all recent access logs and activities", category: "SECURITY", order: 1, defaultDueDays: 1, isHighRiskTask: true, assigneeType: "ORG_USER" },
  { name: "Legal hold check", description: "Verify if any legal holds apply to employee data", category: "LEGAL", order: 2, defaultDueDays: 1, requiresApproval: true, assigneeType: "ORG_USER" },
  { name: "NDA reminder", description: "Send formal NDA and confidentiality reminder", category: "LEGAL", order: 3, defaultDueDays: 0, assigneeType: "ORG_USER" },
];

export const TASK_CATEGORIES = [
  { value: "IT", label: "IT", icon: "computer", color: "#3b82f6" },
  { value: "HR", label: "HR", icon: "groups", color: "#22c55e" },
  { value: "SECURITY", label: "Security", icon: "shield", color: "#ef4444" },
  { value: "ASSETS", label: "Assets", icon: "devices", color: "#f59e0b" },
  { value: "FINANCE", label: "Finance", icon: "payments", color: "#8b5cf6" },
  { value: "LEGAL", label: "Legal", icon: "gavel", color: "#06b6d4" },
  { value: "OTHER", label: "Other", icon: "more_horiz", color: "#6b7280" },
];

export const ASSIGNEE_ROLES = [
  { value: "OWNER", label: "Organization Owner" },
  { value: "ADMIN", label: "Administrator" },
  { value: "MANAGER", label: "Manager (Employee's)" },
  { value: "HR", label: "HR Representative" },
  { value: "IT", label: "IT Administrator" },
];

export const ASSIGNEE_DEPARTMENTS = [
  { value: "HR", label: "Human Resources" },
  { value: "IT", label: "Information Technology" },
  { value: "Finance", label: "Finance" },
  { value: "Legal", label: "Legal" },
  { value: "Security", label: "Security" },
  { value: "Operations", label: "Operations" },
];
