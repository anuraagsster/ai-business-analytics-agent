#!/usr/bin/env python3
"""
Anomaly Detection Script
Detects anomalies in datasets using various methods.
"""
import argparse
import json
import os
import sys
from datetime import datetime
import numpy as np
import pandas as pd

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Detect anomalies in dataset')
    parser.add_argument('--data', required=True, help='Path to input data JSON file')
    parser.add_argument('--method', default='isolation_forest', 
                        choices=['isolation_forest', 'one_class_svm', 'local_outlier_factor'],
                        help='Anomaly detection method')
    parser.add_argument('--contamination', type=float, default=0.1, 
                        help='Expected proportion of outliers in the data')
    parser.add_argument('--features', help='Comma-separated list of feature columns')
    parser.add_argument('--output', required=True, help='Output file path')
    return parser.parse_args()

def detect_with_isolation_forest(data, features, contamination):
    """Detect anomalies using Isolation Forest"""
    # In a real implementation, we would use scikit-learn's IsolationForest here
    print("Using Isolation Forest for anomaly detection")
    # Simulate detection results
    indices = np.random.choice(len(data), int(contamination * len(data)), replace=False)
    is_anomaly = np.zeros(len(data), dtype=bool)
    is_anomaly[indices] = True
    
    # Add anomaly scores (negative values indicate anomalies)
    anomaly_scores = np.random.normal(0, 1, len(data))
    anomaly_scores[indices] -= 2  # Make anomalies have more negative scores
    
    return {
        "is_anomaly": is_anomaly.tolist(),
        "anomaly_score": anomaly_scores.tolist()
    }

def detect_with_one_class_svm(data, features, contamination):
    """Detect anomalies using One-Class SVM"""
    # In a real implementation, we would use scikit-learn's OneClassSVM here
    print("Using One-Class SVM for anomaly detection")
    # Simulate detection results
    indices = np.random.choice(len(data), int(contamination * len(data)), replace=False)
    is_anomaly = np.zeros(len(data), dtype=bool)
    is_anomaly[indices] = True
    
    # Add anomaly scores (negative values indicate anomalies)
    anomaly_scores = np.random.normal(0, 1, len(data))
    anomaly_scores[indices] -= 2  # Make anomalies have more negative scores
    
    return {
        "is_anomaly": is_anomaly.tolist(),
        "anomaly_score": anomaly_scores.tolist()
    }

def detect_with_local_outlier_factor(data, features, contamination):
    """Detect anomalies using Local Outlier Factor"""
    # In a real implementation, we would use scikit-learn's LocalOutlierFactor here
    print("Using Local Outlier Factor for anomaly detection")
    # Simulate detection results
    indices = np.random.choice(len(data), int(contamination * len(data)), replace=False)
    is_anomaly = np.zeros(len(data), dtype=bool)
    is_anomaly[indices] = True
    
    # Add anomaly scores (higher values indicate anomalies for LOF)
    anomaly_scores = np.random.normal(1, 0.3, len(data))
    anomaly_scores[indices] += 1  # Make anomalies have higher scores
    
    return {
        "is_anomaly": is_anomaly.tolist(),
        "anomaly_score": anomaly_scores.tolist()
    }

def main():
    """Main function"""
    args = parse_arguments()
    
    # Read input data
    try:
        with open(args.data, 'r') as f:
            data = json.load(f)
        print(f"Loaded data with {len(data)} records")
    except Exception as e:
        print(f"Error loading data: {e}")
        sys.exit(1)
    
    # Process features
    features = None
    if args.features:
        features = args.features.split(',')
        print(f"Using features: {features}")
    
    # Select detection method
    if args.method == 'isolation_forest':
        result = detect_with_isolation_forest(data, features, args.contamination)
    elif args.method == 'one_class_svm':
        result = detect_with_one_class_svm(data, features, args.contamination)
    elif args.method == 'local_outlier_factor':
        result = detect_with_local_outlier_factor(data, features, args.contamination)
    else:
        print(f"Unknown method: {args.method}")
        sys.exit(1)
    
    # Add metadata to results
    result["metadata"] = {
        "timestamp": datetime.now().isoformat(),
        "method": args.method,
        "contamination": args.contamination,
        "record_count": len(data),
        "anomaly_count": sum(result["is_anomaly"])
    }
    
    # Create temp directory if it doesn't exist
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    
    # Save results to output file
    try:
        with open(args.output, 'w') as f:
            json.dump(result, f)
        print(f"Results saved to {args.output}")
        # Print the output path to stdout for the Node.js server to capture
        print(args.output)
    except Exception as e:
        print(f"Error saving results: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()