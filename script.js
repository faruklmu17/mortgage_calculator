
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
        const downPayment = parseInput(downPaymentInput.value);
        const rate = parseInput(rateInput.value) / 100 / 12;
        const termMonths = parseInput(termInput.value) * 12;
        const annualTax = parseInput(taxInput.value);
        const annualInsurance = parseInput(insuranceInput.value);
        const monthlyHoa = parseInput(hoaInput.value);

        if (price <= 0 || price <= downPayment) {
            showError("Please enter a valid house price and down payment.");
            return;
        }

        if (rate <= 0 || termMonths <= 0) {
            showError("Please enter a valid interest rate and term.");
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
        totalPrincipalDisplay.textContent = formatCurrency(principal);
        totalInterestDisplay.textContent = formatCurrency((monthlyPI * termMonths) - principal);
        totalTaxDisplay.textContent = formatCurrency(monthlyTax + monthlyInsurance + monthlyHoa);
        totalPaymentDisplay.textContent = formatCurrency(totalMonthly * termMonths);

        updateChart(monthlyPI, monthlyTax, monthlyInsurance, monthlyHoa);
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
    }

    function updateChart(pi, tax, ins, hoa) {
        const ctx = document.getElementById('paymentChart').getContext('2d');

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
                            padding: 20
                        }
                    }
                },
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    // Event Listeners
    calcBtn.addEventListener('click', calculate);

    // Auto-format currency on input blur
    [priceInput, downPaymentInput].forEach(input => {
        input.addEventListener('blur', (e) => {
            const val = parseInput(e.target.value);
            if (val > 0) {
                e.target.value = val.toLocaleString('en-US');
            }
        });
    });

    // Initial Calculation
    calculate();
});
