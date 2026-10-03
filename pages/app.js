const entries = [
  { gene: "STXBP1", disease: "STXBP1 encephalopathy", mechanism: "Loss of function", pathway: "Presynaptic vesicle release", organization: "STXBP1 Foundation", symptoms: "epilepsy, developmental delay, tremor" },
  { gene: "STX1B", disease: "STX1B-related developmental and epileptic encephalopathy", mechanism: "Loss of function", pathway: "Presynaptic vesicle release", organization: "STXBP1 Foundation", symptoms: "epilepsy, developmental delay" },
  { gene: "SNAP25", disease: "SNAP25 developmental and epileptic encephalopathy", mechanism: "Loss of function", pathway: "SNARE vesicle fusion", organization: "Rare disease community", symptoms: "epilepsy, developmental delay" },
  { gene: "CACNA1A", disease: "CACNA1A-related disorder", mechanism: "Loss of function", pathway: "Calcium signaling", organization: "Rare disease community", symptoms: "epilepsy, ataxia, developmental delay" },
  { gene: "KCNQ2", disease: "KCNQ2 developmental and epileptic encephalopathy", mechanism: "Loss of function", pathway: "Ion channel excitability", organization: "KCNQ2 Cure Alliance", symptoms: "epilepsy, developmental delay" },
  { gene: "SCN2A", disease: "SCN2A-related disorder", mechanism: "Gain of function", pathway: "Ion channel excitability", organization: "FamilieSCN2A Foundation", symptoms: "epilepsy, developmental delay, autism" },
];

const form = document.querySelector("#atlas-search");
const input = document.querySelector("#search-input");
const status = document.querySelector("#search-status");
const results = document.querySelector("#search-results");

function render(query) {
  const normalized = query.trim().toLocaleLowerCase();
  results.replaceChildren();
  if (!normalized) {
    status.textContent = "Enter a query to explore the public sample.";
    return;
  }
  const matches = entries.filter((entry) => Object.values(entry).join(" ").toLocaleLowerCase().includes(normalized));
  status.textContent = matches.length ? `${matches.length} ${matches.length === 1 ? "connection" : "connections"} in the public sample` : `No public-sample connection for “${query.trim()}”. Try STXBP1 or calcium.`;
  matches.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "result-card";
    const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = entry.gene;
    const title = document.createElement("strong"); title.textContent = entry.disease;
    const pathway = document.createElement("p"); pathway.textContent = `${entry.pathway} · ${entry.mechanism}`;
    const community = document.createElement("p"); community.textContent = entry.organization;
    card.append(tag, title, pathway, community); results.append(card);
  });
}

form.addEventListener("submit", (event) => { event.preventDefault(); render(input.value); });
document.querySelectorAll("[data-query]").forEach((button) => button.addEventListener("click", () => { input.value = button.dataset.query; render(input.value); input.focus(); }));
