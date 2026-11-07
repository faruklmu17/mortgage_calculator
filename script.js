document.addEventListener('DOMContentLoaded', function () {
  // Elements
  const priceInput = document.getElementById('price');
  const downPaymentInput = document.getElementById('downPayment');
  const rateInput = document.getElementById('rate');
  const termInput = document.getElementById('term');
  const taxInput = document.getElementById('tax');
  const insuranceInput = document.getElementById('insurance');
  const hoaInput = document.getElementById('hoa');
  const calcBtn = document.getElementById('calcBtn');
  const errorMsg = document.getElementById('errorMsg');

  // Display elements
  const paymentDisplay = document.getElementById('paymentAmount');
  const totalPrincipalDisplay = document.getElementById('totalPrincipal');
  const totalInterestDisplay = document.getElementById('totalInterest');
  const totalTaxDisplay = document.getElementById('totalTax');
  const totalPaymentDisplay = document.getElementById('totalPayment');
  const piDisplay = document.getElementById('piAmount');

  let myDonutChart = null;

  // Down Payment Toggle State
  let downPaymentMode = 'dollar';
  const btnDollar = document.getElementById('dpDollar');
  const btnPercent = document.getElementById('dpPercent');
  const dpIcon = document.getElementById('dpIcon');

  // Magic Section Elements
  const navCalc = document.getElementById('navCalc');
  const navExtra = document.getElementById('navExtra');
  const calcSection = document.getElementById('calculator');
  const extraMagicSection = document.getElementById('extra-magic-section');

  const magicPrice = document.getElementById('magicPrice');
  const magicDownPayment = document.getElementById('magicDownPayment');
  const magicBalance = document.getElementById('magicBalance');
  const magicRate = document.getElementById('magicRate');
  const magicTerm = document.getElementById('magicTerm');
  const magicTax = document.getElementById('magicTax');
  const magicInsurance = document.getElementById('magicInsurance');
  const magicMonthlyPI = document.getElementById('magicMonthlyPI');
  const extraAmountInput = document.getElementById('extraAmount');
  const magicCalcBtn = document.getElementById('magicCalcBtn');
  const magicErrorMsg = document.getElementById('magicErrorMsg');

  const interestSavedDisplay = document.getElementById('interestSaved');
  const timeSavedDisplay = document.getElementById('timeSaved');
  const standardRemainingDisplay = document.getElementById('standardRemaining');
  const newPayoffTimeDisplay = document.getElementById('newPayoffTime');
  const originalInterestDisplay = document.getElementById('originalInterest');
  const newTotalInterestDisplay = document.getElementById('newTotalInterest');
  const newTotalMonthlyDisplay = document.getElementById('newTotalMonthly');
  const savingsMessage = document.getElementById('savingsMessage');

  const extraMonthlyBtn = document.getElementById('extraMonthlyBtn');
  const extraOneTimeBtn = document.getElementById('extraOneTimeBtn');

  let extraMode = 'monthly';

  function parseInput(val) {
    return parseFloat(String(val).replace(/,/g, '')) || 0;
  }

  function formatCurrency(val) {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0
    }).format(val);
  }

  function showError(message) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
  }

  btnDollar.addEventListener('click', () => {
    if (downPaymentMode === 'dollar') return;
    downPaymentMode = 'dollar';
    btnDollar.classList.add('active');
    btnPercent.classList.remove('active');
    dpIcon.className = 'fas fa-hand-holding-usd';

    const price = parseInput(priceInput.value);
    const currentVal = parseInput(downPaymentInput.value);
    if (currentVal > 0 && price > 0) {
      downPaymentInput.value = Math.round(price * (currentVal / 100)).toLocaleString('en-US');
    }
    calculate();
  });

  btnPercent.addEventListener('click', () => {
    if (downPaymentMode === 'percent') return;
    downPaymentMode = 'percent';
    btnPercent.classList.add('active');
    btnDollar.classList.remove('active');
    dpIcon.className = 'fas fa-percentage';

    const price = parseInput(priceInput.value);
    const currentVal = parseInput(downPaymentInput.value);
    if (currentVal > 0 && price > 0) {
      downPaymentInput.value = ((currentVal / price) * 100).toFixed(1);
    }
    calculate();
  });

  function calculate() {
    errorMsg.style.display = 'none';

    const price = parseInput(priceInput.value);
    let downPayment = parseInput(downPaymentInput.value);

    if (downPaymentMode === 'percent') {
      downPayment = price * (downPayment / 100);
    }

    const monthlyRate = parseInput(rateInput.value) / 100 / 12;
    const termMonths = parseInput(termInput.value) * 12;
    const annualTax = parseInput(taxInput.value);
    const annualInsurance = parseInput(insuranceInput.value);
    const monthlyHoa = parseInput(hoaInput.value);

    if (price <= 0) {
      paymentDisplay.textContent = "$0";
      showError("Please enter a valid home price.");
      return;
    }

    if (downPayment >= price) {
      paymentDisplay.textContent = "$0";
      showError("Down payment must be less than the home price.");
      return;
    }

    if (monthlyRate <= 0 || termMonths <= 0) {
      paymentDisplay.textContent = "$0";
      showError("Please enter a valid interest rate and term.");
      return;
    }

    const principal = price - downPayment;
    const x = Math.pow(1 + monthlyRate, termMonths);
    const monthlyPI = (principal * x * monthlyRate) / (x - 1);
    const monthlyTax = annualTax / 12;
    const monthlyInsurance = annualInsurance / 12;
    const totalMonthly = monthlyPI + monthlyTax + monthlyInsurance + monthlyHoa;

    paymentDisplay.textContent = formatCurrency(totalMonthly);
    piDisplay.textContent = formatCurrency(monthlyPI);
    totalPrincipalDisplay.textContent = formatCurrency(principal);
    totalInterestDisplay.textContent = formatCurrency((monthlyPI * termMonths) - principal);
    totalTaxDisplay.textContent = formatCurrency(monthlyTax + monthlyInsurance + monthlyHoa);
    totalPaymentDisplay.textContent = formatCurrency(totalMonthly * termMonths);

    updateChart(monthlyPI, monthlyTax, monthlyInsurance, monthlyHoa);
  }

  function updateChart(pi, tax, ins, hoa) {
    const canvas = document.getElementById('paymentChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const data = {
      labels: ['P&I', 'Taxes', 'Insurance', 'HOA'],
      datasets: [{
        data: [pi, tax, ins, hoa],
        borderWidth: 0,
        hoverOffset: 4
      }]
    };

    if (myDonutChart) {
      myDonutChart.destroy();
    }

    myDonutChart = new Chart(ctx, {
      type: 'doughnut',
      data,
      options: {
        cutout: '70%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              usePointStyle: true,
              padding: 20,
              font: { size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return context.label + ': ' + formatCurrency(context.raw);
              }
            }
          }
        },
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  function calculateMagic(isPIOverride = false) {
    magicErrorMsg.style.display = 'none';

    const price = parseInput(magicPrice.value);
    const downPayment = parseInput(magicDownPayment.value);
    const currentBalanceInput = parseInput(magicBalance.value);
    const rate = parseInput(magicRate.value) / 100 / 12;
    const termYears = parseInput(magicTerm.value);
    const extraPayment = parseInput(extraAmountInput.value);
    const tax = parseInput(magicTax.value) / 12;
    const insurance = parseInput(magicInsurance.value) / 12;

    const originalPrincipal = price - downPayment;
    const termMonths = termYears * 12;
    const startingBalance = currentBalanceInput > 0 ? currentBalanceInput : originalPrincipal;

    if (price <= 0 || (currentBalanceInput <= 0 && downPayment >= price) || rate <= 0 || termYears <= 0) {
      magicErrorMsg.textContent = "Please enter valid mortgage details.";
      magicErrorMsg.style.display = 'block';
      return;
    }

    const x = Math.pow(1 + rate, termMonths);
    const calculatedPI = (originalPrincipal * x * rate) / (x - 1);

    let standardMonthlyPI = parseInput(magicMonthlyPI.value);
    if (standardMonthlyPI <= 0 || !isPIOverride) {
      standardMonthlyPI = calculatedPI;
      if (document.activeElement !== magicMonthlyPI) {
        magicMonthlyPI.value = Math.round(standardMonthlyPI).toLocaleString('en-US');
      }
    }

    let baselineInterest = 0;
    let baselineMonths = 0;
    let tempBalance = startingBalance;
    while (tempBalance > 0.01 && baselineMonths < 600) {
      baselineMonths++;
      const interestForMonth = tempBalance * rate;
      baselineInterest += interestForMonth;
      let principalRepayment = standardMonthlyPI - interestForMonth;
      if (tempBalance <= principalRepayment) {
        tempBalance = 0;
      } else {
        tempBalance -= principalRepayment;
      }
    }

    let balance = startingBalance;
    let newTotalInterest = 0;
    let monthsToPayoff = 0;
    let oneTimeApplied = false;

    while (balance > 0.01 && monthsToPayoff < 600) {
      monthsToPayoff++;
      const interestForMonth = balance * rate;
      newTotalInterest += interestForMonth;

      let principalRepayment = standardMonthlyPI - interestForMonth;

      if (extraMode === 'monthly') {
        principalRepayment += extraPayment;
      } else if (extraMode === 'one-time' && !oneTimeApplied) {
        principalRepayment += extraPayment;
        oneTimeApplied = true;
      }

      if (balance <= principalRepayment) {
        balance = 0;
      } else {
        balance -= principalRepayment;
      }
    }

    const interestSaved = baselineInterest - newTotalInterest;
    const monthsSaved = baselineMonths - monthsToPayoff;
    const yearsSaved = Math.floor(monthsSaved / 12);
    const remainingMonthsSaved = monthsSaved % 12;

    interestSavedDisplay.textContent = formatCurrency(Math.max(0, interestSaved));

    let timeSavedText = "";
    if (yearsSaved > 0) timeSavedText += `${yearsSaved} year${yearsSaved > 1 ? 's' : ''}`;
    if (remainingMonthsSaved > 0) timeSavedText += (timeSavedText ? " and " : "") + `${remainingMonthsSaved} month${remainingMonthsSaved > 1 ? 's' : ''}`;
    if (monthsSaved <= 0) timeSavedText = "0 months";
    timeSavedDisplay.textContent = timeSavedText;

    standardRemainingDisplay.textContent = `${Math.floor(baselineMonths / 12)}y ${baselineMonths % 12}m`;
    newPayoffTimeDisplay.textContent = `${Math.floor(monthsToPayoff / 12)}y ${monthsToPayoff % 12}m`;
    originalInterestDisplay.textContent = formatCurrency(baselineInterest);
    newTotalInterestDisplay.textContent = formatCurrency(newTotalInterest);
    newTotalMonthlyDisplay.textContent = formatCurrency(standardMonthlyPI + tax + insurance);

    if (interestSaved > 0) {
      savingsMessage.innerHTML = `By paying <strong>${formatCurrency(extraPayment)}</strong> extra ${extraMode === 'monthly' ? 'every month' : 'one-time'}, you'll save <strong>${formatCurrency(interestSaved)}</strong> in total interest!`;
      savingsMessage.style.color = "var(--secondary)";
    } else {
      savingsMessage.textContent = "Increase your extra payment to see how much you can save!";
      savingsMessage.style.color = "inherit";
    }
  }

  navCalc.addEventListener('click', (e) => {
    e.preventDefault();
    calcSection.style.display = 'grid';
    extraMagicSection.style.display = 'none';
    navCalc.classList.add('active');
    navExtra.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  navExtra.addEventListener('click', (e) => {
    e.preventDefault();
    calcSection.style.display = 'none';
    extraMagicSection.style.display = 'grid';
    navExtra.classList.add('active');
    navCalc.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const mainPrice = parseInput(priceInput.value);
    const magicAlreadyFilled = parseInput(magicPrice.value) > 0;

    if (mainPrice > 0 && !magicAlreadyFilled) {
      magicPrice.value = priceInput.value;
      magicDownPayment.value = downPaymentInput.value;
      const principal = mainPrice - parseInput(downPaymentInput.value);
      magicBalance.value = principal.toLocaleString('en-US');
      magicRate.value = rateInput.value;
      magicTerm.value = termInput.value;
      magicTax.value = taxInput.value;
      magicInsurance.value = insuranceInput.value;
      calculateMagic();
    }
  });

  magicCalcBtn.addEventListener('click', calculateMagic);

  [magicPrice, magicDownPayment, magicRate, magicTerm].forEach(field => {
    field.addEventListener('input', () => calculateMagic(false));
  });

  [magicBalance, magicTax, magicInsurance, extraAmountInput].forEach(field => {
    field.addEventListener('input', () => calculateMagic(true));
  });

  magicMonthlyPI.addEventListener('input', () => calculateMagic(true));

  extraMonthlyBtn.addEventListener('click', () => {
    extraMode = 'monthly';
    extraMonthlyBtn.classList.add('active');
    extraOneTimeBtn.classList.remove('active');
    calculateMagic();
  });

  extraOneTimeBtn.addEventListener('click', () => {
    extraMode = 'one-time';
    extraOneTimeBtn.classList.add('active');
    extraMonthlyBtn.classList.remove('active');
    calculateMagic();
  });

  [magicPrice, magicDownPayment, magicBalance, magicTax, magicInsurance, extraAmountInput, magicMonthlyPI].forEach(input => {
    input.addEventListener('blur', (e) => {
      const val = parseInput(e.target.value);
      if (val > 0) e.target.value = val.toLocaleString('en-US');
    });
  });

  calcBtn.addEventListener('click', calculate);

  [priceInput, downPaymentInput, rateInput, taxInput, insuranceInput, hoaInput, termInput].forEach(field => {
    field.addEventListener('input', calculate);
  });

  [priceInput, taxInput, insuranceInput].forEach(input => {
    input.addEventListener('blur', (e) => {
      const val = parseInput(e.target.value);
      if (val > 0) e.target.value = val.toLocaleString('en-US');
    });
  });

  downPaymentInput.addEventListener('blur', (e) => {
    const val = parseInput(e.target.value);
    if (val > 0 && downPaymentMode === 'dollar') e.target.value = val.toLocaleString('en-US');
    else if (val > 0 && downPaymentMode === 'percent') e.target.value = val.toFixed(1);
  });
});

// --- Google Auth Handling ---
function handleCredentialResponse(response) {
    console.log("Encoded JWT ID token: ", response.credential);

    fetch("http://127.0.0.1:8080/auth/google", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ token: response.credential })
    })
    .then(res => res.json())
    .then(data => {
        console.log("Backend verification response:", data);
    })
    .catch(error => {
        console.error("Error sending token to backend:", error);
    });
}

window.handleCredentialResponse = handleCredentialResponse;