
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

    let myDonutChart = null;
    const piDisplay = document.getElementById('piAmount');

    // Down Payment Toggle State
    let downPaymentMode = 'dollar';
    const btnDollar = document.getElementById('dpDollar');
    const btnPercent = document.getElementById('dpPercent');
    const dpIcon = document.getElementById('dpIcon');

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

    function calculate() {
        errorMsg.style.display = 'none';

        const price = parseInput(priceInput.value);
        let downPayment = parseInput(downPaymentInput.value);

        if (downPaymentMode === 'percent') {
            downPayment = price * (downPayment / 100);
        }

        const rate = parseInput(rateInput.value) / 100 / 12;
        const termMonths = parseInput(termInput.value) * 12;
        const annualTax = parseInput(taxInput.value);
        const annualInsurance = parseInput(insuranceInput.value);
        const monthlyHoa = parseInput(hoaInput.value);

        if (price <= 0 || price <= downPayment) {
            paymentDisplay.textContent = "$0";
            return;
        }

        if (rate <= 0 || termMonths <= 0) {
            paymentDisplay.textContent = "$0";
            return;
        }

        const principal = price - downPayment;

        // Mortgage Formula: P [ i(1 + i)^n ] / [ (1 + i)^n – 1]
        const x = Math.pow(1 + rate, termMonths);
        const monthlyPI = (principal * x * rate) / (x - 1);

        const monthlyTax = annualTax / 12;
        const monthlyInsurance = annualInsurance / 12;
        const totalMonthly = monthlyPI + monthlyTax + monthlyInsurance + monthlyHoa;

        // Update UI
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
                backgroundColor: [
                    '#4f46e5',
                    '#10b981',
                    '#f59e0b',
                    '#ef4444'
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        };

        if (myDonutChart) {
            myDonutChart.destroy();
        }

        myDonutChart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
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
                            font: {
                                size: 12
                            }
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

    // Event Listeners for real-time updates
    [priceInput, downPaymentInput, rateInput, taxInput, insuranceInput, hoaInput, termInput].forEach(field => {
        field.addEventListener('input', calculate);
    });

    // Auto-format currency on input blur
    [priceInput, taxInput, insuranceInput].forEach(input => {
        input.addEventListener('blur', (e) => {
            const val = parseInput(e.target.value);
            if (val > 0) {
                e.target.value = val.toLocaleString('en-US');
            }
        });
    });

    downPaymentInput.addEventListener('blur', (e) => {
        const val = parseInput(e.target.value);
        if (val > 0 && downPaymentMode === 'dollar') {
            e.target.value = val.toLocaleString('en-US');
        } else if (val > 0 && downPaymentMode === 'percent') {
            e.target.value = val.toFixed(1);
        }
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

        const inputs = [priceInput, downPaymentInput, rateInput, taxInput, insuranceInput, hoaInput];

        // 1. Initial wait so user sees the page load empty
        setTimeout(() => {
            // 2. Enter Home Price
            priceInput.value = demoData.price;
            calculate();

            // 3. Add Interest Rate
            setTimeout(() => {
                rateInput.value = demoData.rate;
                calculate();

                // 4. Add remaining fields to finish the graph
                setTimeout(() => {
                    downPaymentInput.value = demoData.downPayment;
                    taxInput.value = demoData.tax;
                    insuranceInput.value = demoData.insurance;
                    hoaInput.value = demoData.hoa;
                    calculate();

                    // 5. Once loaded, wait 2.5 seconds and clear inputs to show placeholders
                    setTimeout(() => {
                        inputs.forEach(input => input.value = "");
                        // Not calling calculate() here keeps the results visible 
                        // while exposing the placeholders in the fields.
                    }, 2500);

                }, 400);
            }, 400);
        }, 800);
    }

    // Initial Demo Start
    runDemo();
});
