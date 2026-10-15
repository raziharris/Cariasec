import { useI18n } from "../i18n";
import { salaryLevelsFor, salaryRange } from "../salary";

export function SalaryLevels({ id }: { id: string }) {
  const { t, language } = useI18n();
  const levels = salaryLevelsFor(id);
  const rows = ["junior", "senior", ...(levels.management ? ["management"] : [])] as const;
  return (
    <div className="salary-levels" data-testid="salary-levels">
      <dl>
        {rows.map((key) => {
          const level = levels[key as "junior" | "senior" | "management"];
          return (
            <div className="salary-level" key={key} data-testid={`salary-${key}`}>
              <dt>{key === "junior" ? "Junior" : key === "senior" ? "Senior" : t("Pengurusan")}</dt>
              <dd>
                <b>{level ? salaryRange(level) : t(levels.notApplicable ? "Tidak berkenaan" : "Data belum tersedia")}</b>
                {level && <p>{language === "ms" ? level.roleMs : level.roleEn}</p>}
                {level?.basis === "fiveYears" && <p>{t("Rujukan pengalaman 5 tahun; bukan gred jawatan rasmi.")}</p>}
                {level?.basis === "entry" && <p>{t("Tahap kemasukan")}</p>}
                {level?.basis === "advert" && <p>{t("Contoh satu iklan kerja")}</p>}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="salary-level-note">{t("Anggaran RM sebulan. Julat boleh bertindih mengikut majikan dan bidang.")}</p>
    </div>
  );
}
