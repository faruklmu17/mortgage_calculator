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
