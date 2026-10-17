import { useState } from "react";
import { CardFace } from "./CardFace";
export function Tutorial({ en, done }: { en: boolean; done: () => void }) {
  const [step, setStep] = useState(0),
    [chosen, setChosen] = useState<string[]>([]),
    [feedback, setFeedback] = useState("");
  const tr = (ms: string, eng: string) => (en ? eng : ms);
  const ids =
    step === 0
      ? ["I-3-1", "R-4-1", "A-2-1"]
      : step === 1
        ? ["R-teduh", "I-pintas", "prisma-1"]
        : ["I-3-1", "I-4-1", "R-6-1"];
  const top = step === 1 ? "I-beban" : "I-2-1";
  const correct =
    step === 0
      ? chosen[0] === "I-3-1" || chosen[0] === "A-2-1"
      : step === 1
        ? chosen[0] === "R-teduh"
        : chosen.length === 2 &&
          chosen.includes("I-3-1") &&
          chosen.includes("I-4-1");
  return (
    <section className="rt-tutorial rt-panel">
      <small>
        {tr("BELAJAR SAMBIL MAIN", "LEARN BY PLAYING")} · {step + 1}/3
      </small>
      <h1>
        {
          [
            tr("Cari padanan", "Find a match"),
            tr("Lindungi dengan Teduh", "Defend with Teduh"),
            tr("Cetus Rentak", "Make a Rentak"),
          ][step]
        }
      </h1>
      <p>
        {
          [
            tr(
              "Kad atas ialah Peneroka 2. Pilih warna sama atau nombor 2.",
              "The top card is Explorers 2. Choose the same suit or number 2.",
            ),
            tr(
              "Beban datang! Apa-apa warna Teduh boleh membatalkan dua kad penalti.",
              "Beban incoming! Any Teduh suit cancels the two-card penalty.",
            ),
            tr(
              "Pilih Peneroka 3 dan 4. Dua nombor berturutan, satu giliran. Sekali setiap pusingan.",
              "Select Explorers 3 and 4. Consecutive numbers, one turn. Once per round.",
            ),
          ][step]
        }
      </p>
      <div className="rt-tutorial-top">
        <CardFace id={top} en={en} />
        <span>
          {step === 1
            ? "+2"
            : tr("Warna aktif: Peneroka", "Active suit: Explorers")}
        </span>
      </div>
      <div className="rt-tutorial-cards">
        {ids.map((id) => (
          <button
            key={id}
            aria-pressed={chosen.includes(id)}
            aria-label={id}
            onClick={() => {
              setFeedback("");
              setChosen((previous) =>
                step === 2
                  ? previous.includes(id)
                    ? previous.filter((x) => x !== id)
                    : [...previous.slice(-1), id]
                  : [id],
              );
            }}
          >
            <CardFace id={id} en={en} />
          </button>
        ))}
      </div>
      <p role="status">{feedback}</p>
      <button
        className="rt-primary"
        onClick={() => {
          if (!correct) {
            setFeedback(
              tr(
                "Cuba lagi. Ikut warna, nombor atau arahan di atas.",
                "Try again. Follow the suit, number or instruction above.",
              ),
            );
            return;
          }
          if (step === 2) done();
          else {
            setStep(step + 1);
            setChosen([]);
            setFeedback("");
          }
        }}
      >
        {step === 2
          ? tr("Sedia bermain!", "Ready to play!")
          : tr("Main & seterusnya", "Play & continue")}{" "}
        →
      </button>
      <button className="rt-text" onClick={done}>
        {tr("Langkau tutorial", "Skip tutorial")}
      </button>
    </section>
  );
}
