const examples = {
  hello: `kick off

  socialise "Hello, World."

close the loop`,
  fizzbuzz: `kick off

  loop back on i from 1 to 15
    going forward if i % 15 == 0
      socialise "FizzBuzz"
    pivoting if i % 3 == 0
      socialise "Fizz"
    pivoting if i % 5 == 0
      socialise "Buzz"
    that said
      socialise i
    end of day
  end of day

close the loop`,
  data: `kick off

  synergize double with n
    take this offline n * 2
  end of day

  synergize is material with n
    take this offline n > 5
  end of day

  align on numbers is a key deliverable of pipeline 3, 1, 4, 2
  stakeholder 1 of numbers is a key deliverable of 6

  align on doubled is a key deliverable of map pipeline numbers with double
  align on material is a key deliverable of filter pipeline doubled with is material
  align on sorted is a key deliverable of sort pipeline material

  socialise stakeholder 0 of sorted
  socialise stakeholder 1 of sorted

close the loop`,
};

const input = document.querySelector("#deck-input");
const output = document.querySelector("#deck-output");
const runButton = document.querySelector("#run-button");

input.value = examples.fizzbuzz;

for (const button of document.querySelectorAll("[data-example]")) {
  button.addEventListener("click", () => {
    input.value = examples[button.dataset.example] ?? examples.hello;
    input.focus();
  });
}

runButton.addEventListener("click", runDeck);

input.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    runDeck();
  }
});

async function runDeck() {
  runButton.disabled = true;
  runButton.textContent = "Aligning...";
  output.classList.remove("is-error");
  output.textContent = "Routing deck through governance...";

  try {
    const response = await fetch("/api/run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ source: input.value }),
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      output.classList.add("is-error");
      output.textContent = result.error || "This initiative failed without a clear owner.";
      return;
    }

    output.textContent = result.output.length > 0 ? result.output.join("\n") : "Deck ran. No stakeholders were socialised.";
  } catch (error) {
    output.classList.add("is-error");
    output.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    runButton.disabled = false;
    runButton.textContent = "Socialise";
  }
}
