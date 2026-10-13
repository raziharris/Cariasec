import salaries from "../../shared/salaries.json";

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

export const salaryRange = ({ min, max }: Salary): string =>
  `RM${ringgit.format(min)}–RM${ringgit.format(max)}`;
