import salaries from "../../shared/salaries.json";
import salaryLevels from "../../shared/salary-levels.json";

export type SalaryLevel = Pick<Salary, "min" | "max" | "source" | "reportedMin"> & {
  basis: "entry" | "fiveYears" | "role" | "advert";
  roleMs: string;
  roleEn: string;
};
export type SalaryLevels = {
  checkedAt: string;
  junior: SalaryLevel | null;
  senior: SalaryLevel | null;
  management?: SalaryLevel;
  notApplicable?: boolean;
};
export const salaryLevelsFor = (id: string): SalaryLevels =>
  (salaryLevels as Record<string, SalaryLevels>)[id];

export type Salary = {
  min: number;
  max: number;
  source: string;
  match: string;
  reportedMin?: number;
  kind?: "allowance";
};

export const salaryFor = (id: string): Salary =>
  (salaries as Record<string, Salary>)[id];

const ringgit = new Intl.NumberFormat("ms-MY");

export const salaryRange = ({ min, max }: Pick<Salary, "min" | "max">): string =>
  `RM${ringgit.format(min)}–RM${ringgit.format(max)}`;
