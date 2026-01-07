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
  const mainGuide = document.getElementById('guide');
  const extraMagicGuide = document.getElementById('extra-magic-guide');

  const magicPrice = document.getElementById('magicPrice');
  const magicDownPayment = document.getElementById('magicDownPayment');
  const magicBalance = document.getElementById('magicBalance');
  const magicRate = document.getElementById('magicRate');
  const magicTerm = document.getElementById('magicTerm');
  const magicTax = document.getElementById('magicTax');
  const magicInsurance = document.getElementById('magicInsurance');
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

  let extraMode = 'monthly'; // 'monthly' or 'one-time'

  function parseInput(val) {
    return parseFloat(String(val).replace(/,/g, '')) || 0;
  }

  function formatCurrency(val) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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

    // Convert current percentage value back to dollars
    const price = parseInput(priceInput.value);
    const currentVal = parseInput(downPaymentInput.value);
    if (currentVal > 0 && price > 0) {
      downPaymentInput.value = Math.round(price * (currentVal / 100)).toLocaleString();
    }
    calculate();
  });

  btnPercent.addEventListener('click', () => {
    if (downPaymentMode === 'percent') return;
    downPaymentMode = 'percent';
    btnPercent.classList.add('active');
    btnDollar.classList.remove('active');
    dpIcon.className = 'fas fa-percentage';

    // Convert current dollar value to percentage
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

    // Mortgage Formula: P [ i(1 + i)^n ] / [ (1 + i)^n – 1]
    const x = Math.pow(1 + monthlyRate, termMonths);
    const monthlyPI = (principal * x * monthlyRate) / (x - 1);

    const monthlyTax = annualTax / 12;
    const monthlyInsurance = annualInsurance / 12;
    const totalMonthly = monthlyPI + monthlyTax + monthlyInsurance + monthlyHoa;

    // Update UI
    paymentDisplay.textContent = formatCurrency(totalMonthly);
    piDisplay.textContent = formatCurrency(monthlyPI);
    totalPrincipalDisplay.textContent = formatCurrency(principal);
    totalInterestDisplay.textContent = formatCurrency((monthlyPI * termMonths) - principal);

    // NOTE: This is MONTHLY taxes/fees. Rename label in HTML to "Monthly Taxes & Fees"
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

  function calculateMagic() {
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

    // Start balance defaults to original principal if not provided
    const startingBalance = currentBalanceInput > 0 ? currentBalanceInput : originalPrincipal;

    if (price <= 0 || (currentBalanceInput <= 0 && downPayment >= price) || rate <= 0 || termYears <= 0) {
      magicErrorMsg.textContent = "Please enter valid mortgage details.";
      magicErrorMsg.style.display = 'block';
      return;
    }

    // Standard Monthly PI (calculated from ORIGINAL principal)
    const x = Math.pow(1 + rate, termMonths);
    const standardMonthlyPI = (originalPrincipal * x * rate) / (x - 1);

    // First, simulate standard payoff starting from startingBalance to get baseline interest
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

    // Simulation with EXTRA payment
    let balance = startingBalance;
    let newTotalInterest = 0;
    let monthsToPayoff = 0;

    // One-time payment flag
    let oneTimeApplied = false;

    while (balance > 0.01 && monthsToPayoff < 600) { // Safety cap 50 years
      monthsToPayoff++;
      const interestForMonth = balance * rate;
      newTotalInterest += interestForMonth;

      let principalRepayment = standardMonthlyPI - interestForMonth;

      // Apply extra payment
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

    // Update UI
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

  // Navigation Logic
  navCalc.addEventListener('click', (e) => {
    e.preventDefault();
    calcSection.style.display = 'grid';
    extraMagicSection.style.display = 'none';
    mainGuide.style.display = 'block';
    extraMagicGuide.style.display = 'none';
    navCalc.classList.add('active');
    navExtra.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  navExtra.addEventListener('click', (e) => {
    e.preventDefault();
    calcSection.style.display = 'none';
    extraMagicSection.style.display = 'grid';
    mainGuide.style.display = 'none';
    extraMagicGuide.style.display = 'block';
    navExtra.classList.add('active');
    navCalc.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Sync values from main calculator if they exist
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

    // Always check if demo should run if fields are still empty
    if (parseInput(magicPrice.value) <= 0) {
      runMagicDemo();
    }
  });

  function runMagicDemo() {
    const demoKey = "mpl_magic_demo_v3"; // Renamed to force reset
    if (localStorage.getItem(demoKey) === "1") return;

    console.log("Starting Extra Payment Magic Demo...");

    const demoData = [
      { el: magicPrice, val: "600,000" },
      { el: magicBalance, val: "580,000" },
      { el: magicDownPayment, val: "120,000" },
      { el: magicRate, val: "6.5" },
      { el: magicTerm, val: "30" },
      { el: extraAmountInput, val: "500" }
    ];

    let fieldIdx = 0;

    function typeField(index, charIdx) {
      if (index >= demoData.length) {
        localStorage.setItem(demoKey, "1");
        // Add a soft glow to results to signal completion
        const results = document.querySelector('#extra-magic-section .results-card');
        if (results) {
          results.style.transition = "all 0.5s ease";
          results.style.transform = "scale(1.02)";
          setTimeout(() => {
            results.style.transform = "scale(1)";
            // Clear fields after user has seen the result for a moment
            setTimeout(() => {
              demoData.forEach(item => {
                item.el.value = "";
              });
              // Note: We don't call calculateMagic() here so the results stay visible
              // until the user starts typing their own values.
            }, 2000);
          }, 500);
        }
        return;
      }

      const item = demoData[index];
      const targetVal = item.val;

      if (charIdx <= targetVal.length) {
        item.el.value = targetVal.substring(0, charIdx);
        // Calculate as we type for real-time feel
        if (charIdx === targetVal.length || charIdx % 3 === 0) calculateMagic();

        // Faster typing for numbers
        setTimeout(() => typeField(index, charIdx + 1), 40);
      } else {
        // Pause between fields
        setTimeout(() => typeField(index + 1, 0), 200);
      }
    }

    // Clear fields before starting
    demoData.forEach(d => d.el.value = "");
    typeField(0, 0);
  }

  // Magic Section Event Listeners
  magicCalcBtn.addEventListener('click', calculateMagic);

  [magicPrice, magicDownPayment, magicBalance, magicRate, magicTerm, magicTax, magicInsurance, extraAmountInput].forEach(field => {
    field.addEventListener('input', calculateMagic);
  });

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

  // Share values for blur formatting
  [magicPrice, magicDownPayment, magicBalance, magicTax, magicInsurance, extraAmountInput].forEach(input => {
    input.addEventListener('blur', (e) => {
      const val = parseInput(e.target.value);
      if (val > 0) e.target.value = val.toLocaleString('en-US');
    });
  });

  // Button should work
  calcBtn.addEventListener('click', calculate);

  // Get Started button functionality
  document.getElementById('getStartedBtn').addEventListener('click', () => {
    priceInput.focus();
    priceInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // Event Listeners for real-time updates
  [priceInput, downPaymentInput, rateInput, taxInput, insuranceInput, hoaInput, termInput].forEach(field => {
    field.addEventListener('input', calculate);
  });

  // Auto-format currency on input blur
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

  function runDemo() {
    const demoData = {
      price: "525,000",
      downPayment: "105,000",
      rate: "6.75",
      tax: "6,300",
      insurance: "1,440",
      hoa: "250"
    };

    setTimeout(() => {
      priceInput.value = demoData.price;
      calculate();

      setTimeout(() => {
        rateInput.value = demoData.rate;
        calculate();

        setTimeout(() => {
          downPaymentInput.value = demoData.downPayment;
          taxInput.value = demoData.tax;
          insuranceInput.value = demoData.insurance;
          hoaInput.value = demoData.hoa;
          calculate();
        }, 400);
      }, 400);
    }, 800);
  }

  // Placeholder Typewriter Animation
  function initTypewriter() {
    const text = "Enter your home price here...";
    let charIndex = 0;
    let isDeleting = false;
    let typeSpeed = 150;

    function type() {
      // Stop and Reset if user has typed something or the field is focused
      if (priceInput.value !== "" || document.activeElement === priceInput) {
        priceInput.placeholder = text;
        setTimeout(type, 1000); // Check again in 1s
        return;
      }

      const currentText = isDeleting
        ? text.substring(0, charIndex--)
        : text.substring(0, charIndex++);

      priceInput.placeholder = currentText + (isDeleting ? "" : "|");

      if (!isDeleting && charIndex > text.length) {
        isDeleting = true;
        typeSpeed = 3000; // Long pause at full message
      } else if (isDeleting && charIndex < 0) {
        isDeleting = false;
        charIndex = 0;
        typeSpeed = 500; // Pause before restarting
      } else {
        typeSpeed = isDeleting ? 50 : 100;
      }

      setTimeout(type, typeSpeed);
    }

    type();
  }

  initTypewriter();

  // Run demo only once per visitor (recommended)
  function runDemoOnce() {
    if (localStorage.getItem("mpl_demo_seen") === "1") return;
    localStorage.setItem("mpl_demo_seen", "1");
    runDemo();
  }

  runDemoOnce();
});
