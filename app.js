const STORAGE_KEY = "banking-system-state-v1";

const defaultState = {
  currentUserId: null,
  users: [
    {
      id: "u-admin",
      name: "Bank Administrator",
      email: "admin@bank.test",
      password: "admin123",
      role: "admin",
      accountNumber: "900001",
      status: "Active",
      balance: 0
    },
    {
      id: "u-customer",
      name: "Demo Customer",
      email: "customer@bank.test",
      password: "customer123",
      role: "customer",
      accountNumber: "100001",
      status: "Active",
      balance: 25000
    },
    {
      id: "u-nisha",
      name: "Nisha Patel",
      email: "nisha@bank.test",
      password: "nisha123",
      role: "customer",
      accountNumber: "100002",
      status: "Active",
      balance: 18000
    }
  ],
  transactions: [
    {
      id: "t-1",
      userId: "u-customer",
      type: "deposit",
      description: "Opening balance",
      amount: 25000,
      balance: 25000,
      date: "2026-05-04T10:30:00.000Z"
    },
    {
      id: "t-2",
      userId: "u-nisha",
      type: "deposit",
      description: "Opening balance",
      amount: 18000,
      balance: 18000,
      date: "2026-05-04T10:35:00.000Z"
    }
  ],
  loans: [],
  tickets: []
};

let state = loadState();

const authPanel = document.querySelector("#authPanel");
const appPanel = document.querySelector("#appPanel");
const navItems = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");
const toast = document.querySelector("#toast");

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR"
});

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return structuredClone(defaultState);
  }

  try {
    return JSON.parse(saved);
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currentUser() {
  return state.users.find((user) => user.id === state.currentUserId) || null;
}

function customerUsers() {
  return state.users.filter((user) => user.role === "customer");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function setView(viewName) {
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
  views.forEach((view) => view.classList.toggle("active", view.id === `${viewName}View`));

  const titles = {
    dashboard: "Dashboard",
    transactions: "Transactions",
    transfer: "Transfer Funds",
    loans: "Loan Services",
    support: "Customer Support",
    admin: "Administration"
  };

  document.querySelector("#viewTitle").textContent = titles[viewName];
  document.querySelector("#viewEyebrow").textContent =
    currentUser()?.role === "admin" ? "Admin portal" : "Customer portal";
}

function renderApp() {
  const user = currentUser();
  const signedIn = Boolean(user);

  authPanel.classList.toggle("hidden", signedIn);
  appPanel.classList.toggle("hidden", !signedIn);
  document.querySelector("#logoutBtn").classList.toggle("hidden", !signedIn);

  document.querySelector("#sessionRole").textContent = signedIn ? user.role.toUpperCase() : "Guest";
  document.querySelector("#sessionName").textContent = signedIn ? user.name : "Not signed in";

  document.querySelectorAll(".admin-only").forEach((element) => {
    element.classList.toggle("hidden", user?.role !== "admin");
  });

  if (!signedIn) {
    return;
  }

  if (user.role !== "admin" && document.querySelector(".nav-item.active")?.dataset.view === "admin") {
    setView("dashboard");
  }

  renderDashboard();
  renderTransactions();
  renderLoans();
  renderTickets();
  renderAdmin();
}

function renderDashboard() {
  const user = currentUser();
  const userTransactions = transactionsFor(user.id);
  const currentMonth = new Date().toISOString().slice(0, 7);

  document.querySelector("#balanceMetric").textContent = money.format(user.balance);
  document.querySelector("#accountMetric").textContent = user.accountNumber;
  document.querySelector("#statusMetric").textContent = user.status;
  document.querySelector("#activityMetric").textContent = userTransactions.filter((item) =>
    item.date.startsWith(currentMonth)
  ).length;

  document.querySelector("#recentTransactions").innerHTML = userTransactions
    .slice(0, 5)
    .map(transactionListItem)
    .join("") || emptyState("No transactions yet.");
}

function renderTransactions() {
  const user = currentUser();
  const search = document.querySelector("#transactionSearch").value.trim().toLowerCase();
  const from = document.querySelector("#statementFrom").value;
  const to = document.querySelector("#statementTo").value;
  const allRows = transactionsFor(user.id).sort((a, b) => new Date(a.date) - new Date(b.date));
  const rows = allRows.filter((transaction) => {
    const date = transaction.date.slice(0, 10);
    const matchesSearch = `${transaction.type} ${transaction.description}`.toLowerCase().includes(search);
    const matchesFrom = !from || date >= from;
    const matchesTo = !to || date <= to;
    return matchesSearch && matchesFrom && matchesTo;
  });
  const rowsNewestFirst = [...rows].sort((a, b) => new Date(b.date) - new Date(a.date));
  const openingBalance = rows.length ? rows[0].balance - rows[0].amount : user.balance;
  const closingBalance = rows.length ? rows[rows.length - 1].balance : openingBalance;
  const totalCredits = rows.reduce((total, transaction) => total + Math.max(transaction.amount, 0), 0);
  const totalDebits = rows.reduce((total, transaction) => total + Math.abs(Math.min(transaction.amount, 0)), 0);

  document.querySelector("#statementHolder").textContent = user.name;
  document.querySelector("#statementAccount").textContent = user.accountNumber;
  document.querySelector("#statementGenerated").textContent = formatDate(new Date().toISOString());
  document.querySelector("#openingBalance").textContent = money.format(openingBalance);
  document.querySelector("#totalCredits").textContent = money.format(totalCredits);
  document.querySelector("#totalDebits").textContent = money.format(totalDebits);
  document.querySelector("#closingBalance").textContent = money.format(closingBalance);

  document.querySelector("#transactionTable").innerHTML = rowsNewestFirst
    .map((transaction) => {
      const signClass = transaction.amount >= 0 ? "positive" : "negative";
      return `
        <tr>
          <td>${formatDate(transaction.date)}</td>
          <td>${titleCase(transaction.type)}</td>
          <td>${transaction.description}</td>
          <td class="right ${signClass}">${money.format(transaction.amount)}</td>
          <td class="right">${money.format(transaction.balance)}</td>
        </tr>
      `;
    })
    .join("") || `<tr><td colspan="5">No matching transactions.</td></tr>`;
}

function transactionListItem(transaction) {
  const signClass = transaction.amount >= 0 ? "positive" : "negative";
  return `
    <article class="list-item">
      <strong>${titleCase(transaction.type)} <span class="${signClass}">${money.format(transaction.amount)}</span></strong>
      <p>${transaction.description}</p>
      <span>${formatDate(transaction.date)} · Balance ${money.format(transaction.balance)}</span>
    </article>
  `;
}

function renderLoans() {
  const user = currentUser();
  const loans = state.loans.filter((loan) => user.role === "admin" || loan.userId === user.id);

  document.querySelector("#loanList").innerHTML = loans
    .map((loan) => `
      <article class="list-item">
        <strong>${loan.type} loan - ${money.format(loan.amount)}</strong>
        <span>${loan.term} months · ${loan.status} · ${formatDate(loan.date)}</span>
      </article>
    `)
    .join("") || emptyState("No loan applications.");
}

function renderTickets() {
  const user = currentUser();
  const tickets = state.tickets.filter((ticket) => user.role === "admin" || ticket.userId === user.id);

  document.querySelector("#ticketList").innerHTML = tickets
    .map((ticket) => `
      <article class="list-item">
        <strong>${ticket.category} · ${ticket.status}</strong>
        <p>${ticket.details}</p>
        <span>${formatDate(ticket.date)}</span>
      </article>
    `)
    .join("") || emptyState("No support tickets.");
}

function renderAdmin() {
  const user = currentUser();
  if (user?.role !== "admin") {
    return;
  }

  document.querySelector("#customerList").innerHTML = customerUsers()
    .map((customer) => `
      <article class="list-item">
        <strong>${customer.name}</strong>
        <span>${customer.email} · ${customer.accountNumber} · ${money.format(customer.balance)}</span>
        <div class="row-actions">
          <button class="secondary" data-toggle-status="${customer.id}">
            ${customer.status === "Active" ? "Freeze" : "Activate"}
          </button>
        </div>
      </article>
    `)
    .join("");

  const approvals = [
    ...state.loans.filter((loan) => loan.status === "Pending").map((item) => ({ ...item, kind: "loan" })),
    ...state.tickets.filter((ticket) => ticket.status === "Open").map((item) => ({ ...item, kind: "ticket" }))
  ];

  document.querySelector("#approvalList").innerHTML = approvals
    .map((item) => {
      const owner = state.users.find((userItem) => userItem.id === item.userId);
      const label = item.kind === "loan" ? `${item.type} loan ${money.format(item.amount)}` : item.category;
      return `
        <article class="list-item">
          <strong>${label}</strong>
          <span>${owner?.name || "Unknown customer"} · ${formatDate(item.date)}</span>
          <div class="row-actions">
            <button class="primary" data-approve="${item.kind}:${item.id}">Approve</button>
            <button class="secondary" data-reject="${item.kind}:${item.id}">Reject</button>
          </div>
        </article>
      `;
    })
    .join("") || emptyState("No pending approvals.");
}

function transactionsFor(userId) {
  return state.transactions
    .filter((transaction) => transaction.userId === userId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function addTransaction(userId, type, description, amount) {
  const user = state.users.find((item) => item.id === userId);
  user.balance = Number((user.balance + amount).toFixed(2));
  state.transactions.push({
    id: crypto.randomUUID(),
    userId,
    type,
    description,
    amount,
    balance: user.balance,
    date: new Date().toISOString()
  });
}

function emptyState(message) {
  return `<article class="list-item"><span>${message}</span></article>`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function titleCase(value) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function requireActiveCustomer(user) {
  if (user.role === "admin") {
    showToast("Admin users manage records but do not perform customer cash operations.");
    return false;
  }

  if (user.status !== "Active") {
    showToast("This account is frozen. Contact the bank administrator.");
    return false;
  }

  return true;
}

document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("[data-auth-tab]").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector("#loginForm").classList.toggle("hidden", tab.dataset.authTab !== "login");
    document.querySelector("#registerForm").classList.toggle("hidden", tab.dataset.authTab !== "register");
  });
});

document.querySelector("#loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.querySelector("#loginEmail").value.trim().toLowerCase();
  const password = document.querySelector("#loginPassword").value;
  const user = state.users.find((item) => item.email.toLowerCase() === email && item.password === password);

  if (!user) {
    showToast("Invalid email or password.");
    return;
  }

  state.currentUserId = user.id;
  saveState();
  setView("dashboard");
  renderApp();
});

document.querySelector("#registerForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#registerName").value.trim();
  const email = document.querySelector("#registerEmail").value.trim().toLowerCase();
  const password = document.querySelector("#registerPassword").value;

  if (state.users.some((user) => user.email.toLowerCase() === email)) {
    showToast("An account already exists for this email.");
    return;
  }

  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    password,
    role: "customer",
    accountNumber: String(100001 + customerUsers().length),
    status: "Active",
    balance: 0
  };

  state.users.push(user);
  state.currentUserId = user.id;
  saveState();
  setView("dashboard");
  renderApp();
  showToast("Account created successfully.");
});

document.querySelector("#logoutBtn").addEventListener("click", () => {
  state.currentUserId = null;
  saveState();
  renderApp();
});

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    if (!item.classList.contains("hidden")) {
      setView(item.dataset.view);
    }
  });
});

document.querySelectorAll("[data-view-shortcut]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.viewShortcut));
});

document.querySelector("#cashForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const user = currentUser();
  if (!requireActiveCustomer(user)) {
    return;
  }

  const amount = Number(document.querySelector("#cashAmount").value);
  const type = document.querySelector("#cashType").value;
  const signedAmount = type === "deposit" ? amount : -amount;

  if (type === "withdraw" && user.balance < amount) {
    showToast("Insufficient balance.");
    return;
  }

  addTransaction(user.id, type, titleCase(type), signedAmount);
  document.querySelector("#cashForm").reset();
  saveState();
  renderApp();
  showToast(`${titleCase(type)} completed.`);
});

document.querySelector("#transferForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const user = currentUser();
  if (!requireActiveCustomer(user)) {
    return;
  }

  const accountNumber = document.querySelector("#transferAccount").value.trim();
  const amount = Number(document.querySelector("#transferAmount").value);
  const purpose = document.querySelector("#transferPurpose").value.trim();
  const recipient = state.users.find((item) => item.accountNumber === accountNumber && item.role === "customer");

  if (!recipient || recipient.id === user.id) {
    showToast("Enter a valid beneficiary account.");
    return;
  }

  if (recipient.status !== "Active") {
    showToast("Beneficiary account is not active.");
    return;
  }

  if (user.balance < amount) {
    showToast("Insufficient balance for this transfer.");
    return;
  }

  addTransaction(user.id, "transfer", `Transfer to ${recipient.name}: ${purpose}`, -amount);
  addTransaction(recipient.id, "transfer", `Transfer from ${user.name}: ${purpose}`, amount);
  document.querySelector("#transferForm").reset();
  saveState();
  renderApp();
  showToast("Transfer completed.");
});

document.querySelector("#loanForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const user = currentUser();
  if (!requireActiveCustomer(user)) {
    return;
  }

  state.loans.push({
    id: crypto.randomUUID(),
    userId: user.id,
    type: document.querySelector("#loanType").value,
    amount: Number(document.querySelector("#loanAmount").value),
    term: Number(document.querySelector("#loanTerm").value),
    status: "Pending",
    date: new Date().toISOString()
  });
  event.target.reset();
  saveState();
  renderApp();
  showToast("Loan request submitted.");
});

document.querySelector("#ticketForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const user = currentUser();
  if (!user) {
    return;
  }

  state.tickets.push({
    id: crypto.randomUUID(),
    userId: user.id,
    category: document.querySelector("#ticketCategory").value,
    details: document.querySelector("#ticketDetails").value.trim(),
    status: "Open",
    date: new Date().toISOString()
  });
  event.target.reset();
  saveState();
  renderApp();
  showToast("Support ticket opened.");
});

document.querySelector("#transactionSearch").addEventListener("input", renderTransactions);
document.querySelector("#statementFilterForm").addEventListener("submit", (event) => {
  event.preventDefault();
  renderTransactions();
});
document.querySelector("#clearStatementFilter").addEventListener("click", () => {
  document.querySelector("#statementFrom").value = "";
  document.querySelector("#statementTo").value = "";
  document.querySelector("#transactionSearch").value = "";
  renderTransactions();
});
document.querySelector("#printStatementBtn").addEventListener("click", () => {
  window.print();
});

document.querySelector("#adminView").addEventListener("click", (event) => {
  const statusUserId = event.target.dataset.toggleStatus;
  if (statusUserId) {
    const user = state.users.find((item) => item.id === statusUserId);
    user.status = user.status === "Active" ? "Frozen" : "Active";
    saveState();
    renderApp();
    showToast(`Account ${user.status.toLowerCase()}.`);
  }

  const approval = event.target.dataset.approve || event.target.dataset.reject;
  if (approval) {
    const [kind, id] = approval.split(":");
    const collection = kind === "loan" ? state.loans : state.tickets;
    const item = collection.find((entry) => entry.id === id);
    item.status = event.target.dataset.approve ? "Approved" : "Rejected";
    saveState();
    renderApp();
    showToast(`${titleCase(kind)} ${item.status.toLowerCase()}.`);
  }
});

renderApp();
