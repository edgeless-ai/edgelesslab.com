import marimo as mo
import pandas as pd
import numpy as np

# Initialize Marimo app with Edgeless design system styling (placeholder)
app = mo.App(width="full", app_title="Unified Trading Dashboard")

# Dummy data generation for illustration
def generate_dummy_data():
    dates = pd.date_range(end=pd.Timestamp.today(), periods=30)
    equity = np.cumsum(np.random.randn(30) * 10 + 100)
    positions = pd.DataFrame({
        "Symbol": ["AAPL", "TSLA", "GOOG"],
        "Qty": [50, 20, 10],
        "Price": [150.0, 650.0, 2700.0],
    })
    orders = pd.DataFrame({
        "ID": range(1, 6),
        "Symbol": ["AAPL", "TSLA", "AAPL", "GOOG", "TSLA"],
        "Side": ["Buy", "Sell", "Buy", "Buy", "Sell"],
        "Qty": [10, 5, 15, 2, 8],
        "Price": [148.5, 655.0, 149.0, 2695.0, 660.0],
    })
    risk = {
        "Sharpe": 0.45,
        "Drawdown": "12%",
        "Volatility": "8%",
    }
    return dates, equity, positions, orders, risk

dates, equity, positions_df, orders_df, risk_metrics = generate_dummy_data()

# UI components
equity_chart = mo.ui.plotly(
    data=[{"x": dates, "y": equity, "type": "scatter", "mode": "lines", "name": "Equity"}],
    layout={"title": {"text": "Equity Curve"}, "xaxis": {"title": "Date"}, "yaxis": {"title": "Equity ($)"}},
    height=300,
)

positions_table = mo.ui.table(positions_df)
orders_table = mo.ui.table(orders_df)

risk_md = mo.md(f"""
**Risk Metrics**

- **Sharpe Ratio:** {risk_metrics['Sharpe']}
- **Max Drawdown:** {risk_metrics['Drawdown']}
- **Volatility:** {risk_metrics['Volatility']}
""")

# Layout
mo.md("# Unified Trading Dashboard")
mo.md("---")
mo.md("## Equity Performance")
mo.show(equity_chart)
mo.md("---")
mo.md("## Positions")
mo.show(positions_table)
mo.md("---")
mo.md("## Orders")
mo.show(orders_table)
mo.md("---")
mo.md("## Risk Overview")
mo.show(risk_md)

# End of notebook