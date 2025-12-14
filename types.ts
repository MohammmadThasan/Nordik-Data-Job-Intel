export enum EmploymentType {
  Permanent = "Permanent",
  Contract = "Contract",
  Unknown = "Unknown"
}

export enum SeniorityLevel {
  Junior = "Junior",
  Mid = "Mid",
  Senior = "Senior",
  Unknown = "Unknown"
}

export interface JobAlert {
  job_title: string;
  company: string;
  primary_role: string;
  location: string;
  employment_type: EmploymentType;
  seniority: SeniorityLevel;
  publish_date_utc: string; // ISO 8601 UTC string
  job_age_hours: number;
  match_score: number;
  key_skills: string[];
  source: string;
  apply_url: string;
  alert_message_en: string;
  alert_message_sv: string;
}

export interface AgentState {
  isScanning: boolean;
  jobs: JobAlert[];
  lastScanTime: Date | null;
  logs: string[];
}