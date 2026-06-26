import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

def generate_data(num_customers=5000, num_transactions=150000):
    print(f"Generating synthetic e-commerce dataset: {num_customers} customers, {num_transactions} transactions...")
    np.random.seed(42)
    
    # 1. Generate Customers Data
    customer_ids = [f"CUST-{i:05d}" for i in range(1, num_customers + 1)]
    
    countries = ['United States', 'United Kingdom', 'Canada', 'Germany', 'France', 'Australia', 'India']
    country_probs = [0.4, 0.15, 0.1, 0.1, 0.08, 0.07, 0.1]
    
    sources = ['Google Search', 'Direct', 'LinkedIn Referral', 'Newsletter', 'Paid Social', 'Affiliate']
    source_probs = [0.35, 0.2, 0.1, 0.15, 0.15, 0.05]
    
    genders = ['Male', 'Female', 'Non-Binary', 'Undisclosed']
    gender_probs = [0.47, 0.49, 0.02, 0.02]
    
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2025, 12, 31)
    days_range = (end_date - start_date).days
    
    join_dates = [start_date + timedelta(days=int(np.random.randint(0, days_range))) for _ in range(num_customers)]
    
    customers_df = pd.DataFrame({
        'customer_id': customer_ids,
        'join_date': [d.strftime('%Y-%m-%d') for d in join_dates],
        'age': np.random.normal(34, 10, num_customers).astype(int).clip(18, 75),
        'gender': np.random.choice(genders, num_customers, p=gender_probs),
        'country': np.random.choice(countries, num_customers, p=country_probs),
        'traffic_source': np.random.choice(sources, num_customers, p=source_probs)
    })
    
    # 2. Generate Transactions Data
    tx_ids = [f"TX-{i:07d}" for i in range(1, num_transactions + 1)]
    
    categories = ['Electronics', 'Apparel', 'Home & Kitchen', 'Books & Media', 'Sports & Outdoors', 'Office Supplies']
    cat_probs = [0.25, 0.3, 0.15, 0.1, 0.12, 0.08]
    
    payment_methods = ['Credit Card', 'PayPal', 'Apple Pay', 'Bank Transfer', 'Store Credit']
    pay_probs = [0.55, 0.25, 0.12, 0.05, 0.03]
    
    # Map transaction customer distribution (some buy a lot, some buy once)
    customer_weights = np.random.exponential(scale=1.0, size=num_customers)
    customer_weights /= customer_weights.sum()
    tx_customers = np.random.choice(customer_ids, num_transactions, p=customer_weights)
    
    # Generate dates. Transaction date must be after customer join date
    cust_join_map = dict(zip(customers_df['customer_id'], join_dates))
    
    tx_dates = []
    for cust in tx_customers:
        c_join = cust_join_map[cust]
        max_days = (end_date - c_join).days
        if max_days <= 0:
            tx_date = c_join
        else:
            tx_date = c_join + timedelta(days=int(np.random.randint(0, max_days)))
        tx_dates.append(tx_date)
        
    # Generate prices depending on product categories
    cat_price_ranges = {
        'Electronics': (50.0, 1200.0),
        'Apparel': (15.0, 150.0),
        'Home & Kitchen': (20.0, 450.0),
        'Books & Media': (5.0, 60.0),
        'Sports & Outdoors': (10.0, 300.0),
        'Office Supplies': (2.0, 100.0)
    }
    
    tx_categories = np.random.choice(categories, num_transactions, p=cat_probs)
    tx_amounts = []
    
    for cat in tx_categories:
        min_p, max_p = cat_price_ranges[cat]
        # Log normal distribution for prices to make it realistic (lots of cheap items, few expensive ones)
        val = np.random.lognormal(mean=np.log((min_p + max_p)/4), sigma=0.6)
        tx_amounts.append(round(clip_val(val, min_p, max_p), 2))
        
    # Introduce some noise/dirty data for cleaning demonstration
    # (e.g., missing customer_ids, negative amounts, duplicate rows)
    tx_amounts = np.array(tx_amounts)
    tx_customers = np.array(tx_customers)
    
    # 0.5% duplicate rows
    # 0.2% null customer_ids
    # 0.1% negative amount anomalies
    null_cust_indices = np.random.choice(num_transactions, int(num_transactions * 0.002), replace=False)
    neg_amt_indices = np.random.choice(num_transactions, int(num_transactions * 0.001), replace=False)
    
    tx_customers_dirty = tx_customers.copy()
    tx_customers_dirty[null_cust_indices] = None
    
    tx_amounts_dirty = tx_amounts.copy()
    tx_amounts_dirty[neg_amt_indices] = -99.99
    
    transactions_df = pd.DataFrame({
        'transaction_id': tx_ids,
        'customer_id': tx_customers_dirty,
        'transaction_date': [d.strftime('%Y-%m-%d %H:%M:%S') for d in tx_dates],
        'amount': tx_amounts_dirty,
        'product_category': tx_categories,
        'payment_method': np.random.choice(payment_methods, num_transactions, p=pay_probs)
    })
    
    # Duplicate generation
    dup_indices = np.random.choice(num_transactions, int(num_transactions * 0.005), replace=False)
    duplicates = transactions_df.iloc[dup_indices].copy()
    # Change transaction id slightly or keep same to represent double-submission
    transactions_df = pd.concat([transactions_df, duplicates], ignore_index=True)
    
    # Shuffle transactions
    transactions_df = transactions_df.sample(frac=1).reset_index(drop=True)
    
    os.makedirs('data', exist_ok=True)
    customers_df.to_csv('data/raw_customers.csv', index=False)
    transactions_df.to_csv('data/raw_transactions.csv', index=False)
    
    print("Generation complete! Saved data to:")
    print(" - data/raw_customers.csv")
    print(" - data/raw_transactions.csv")

def clip_val(val, min_v, max_v):
    return max(min(val, max_v), min_v)

if __name__ == '__main__':
    generate_data()
