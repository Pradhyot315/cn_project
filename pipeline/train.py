"""
FP32 MLP Model (16 -> 32 -> 16 -> 1) with Class-Weighted Training in NumPy.
"""

import json
import numpy as np

class FP32MLP:
    def __init__(self, seed=42):
        rng = np.random.default_rng(seed)
        # He initialization
        self.W1 = rng.normal(0.0, np.sqrt(2.0 / 16.0), (16, 32)).astype(np.float32)
        self.b1 = np.zeros(32, dtype=np.float32)
        
        self.W2 = rng.normal(0.0, np.sqrt(2.0 / 32.0), (32, 16)).astype(np.float32)
        self.b2 = np.zeros(16, dtype=np.float32)
        
        self.W3 = rng.normal(0.0, np.sqrt(2.0 / 16.0), (16, 1)).astype(np.float32)
        self.b3 = np.zeros(1, dtype=np.float32)

    def forward(self, X):
        """Forward pass returning intermediate activations and probabilities."""
        z1 = np.dot(X, self.W1) + self.b1
        a1 = np.maximum(0.0, z1)
        
        z2 = np.dot(a1, self.W2) + self.b2
        a2 = np.maximum(0.0, z2)
        
        z3 = np.dot(a2, self.W3) + self.b3
        # numerically stable sigmoid
        prob = np.where(z3 >= 0, 1.0 / (1.0 + np.exp(-z3)), np.exp(z3) / (1.0 + np.exp(z3)))
        return {
            "z1": z1, "a1": a1,
            "z2": z2, "a2": a2,
            "z3": z3, "prob": prob
        }

    def predict_prob(self, X):
        X = np.asarray(X, dtype=np.float32)
        if X.ndim == 1:
            X = X.reshape(1, -1)
        res = self.forward(X)
        return res["prob"].flatten()

    def predict(self, X, threshold=0.5):
        probs = self.predict_prob(X)
        return (probs >= threshold).astype(int)

    def to_dict(self):
        return {
            "W1": self.W1.tolist(),
            "b1": self.b1.tolist(),
            "W2": self.W2.tolist(),
            "b2": self.b2.tolist(),
            "W3": self.W3.tolist(),
            "b3": self.b3.tolist(),
        }

    @classmethod
    def from_dict(cls, d):
        model = cls()
        model.W1 = np.array(d["W1"], dtype=np.float32)
        model.b1 = np.array(d["b1"], dtype=np.float32)
        model.W2 = np.array(d["W2"], dtype=np.float32)
        model.b2 = np.array(d["b2"], dtype=np.float32)
        model.W3 = np.array(d["W3"], dtype=np.float32)
        model.b3 = np.array(d["b3"], dtype=np.float32)
        return model

def train_fp32_mlp(X_train, y_train, epochs=12, batch_size=512, lr=0.003, seed=42):
    """
    Trains FP32 MLP using mini-batch Adam and class-weighted BCE loss.
    """
    model = FP32MLP(seed=seed)
    N = X_train.shape[0]
    
    # Class weights
    n_pos = np.sum(y_train == 1)
    n_neg = np.sum(y_train == 0)
    w_pos = float(N / (2.0 * max(1, n_pos)))
    w_neg = float(N / (2.0 * max(1, n_neg)))
    
    # Adam state
    params = [model.W1, model.b1, model.W2, model.b2, model.W3, model.b3]
    m = [np.zeros_like(p) for p in params]
    v = [np.zeros_like(p) for p in params]
    beta1, beta2, eps = 0.9, 0.999, 1e-8
    t_step = 0
    
    rng = np.random.default_rng(seed)
    
    for ep in range(epochs):
        indices = rng.permutation(N)
        X_shuffled = X_train[indices]
        y_shuffled = y_train[indices]
        
        for start_idx in range(0, N, batch_size):
            end_idx = min(start_idx + batch_size, N)
            xb = X_shuffled[start_idx:end_idx]
            yb = y_shuffled[start_idx:end_idx].reshape(-1, 1)
            b_size = xb.shape[0]
            
            # Forward
            fwd = model.forward(xb)
            prob = fwd["prob"]
            a1, a2 = fwd["a1"], fwd["a2"]
            z1, z2 = fwd["z1"], fwd["z2"]
            
            # Sample weights
            sample_w = np.where(yb == 1, w_pos, w_neg)
            
            # Backward
            dz3 = sample_w * (prob - yb) # [B, 1]
            dW3 = np.dot(a2.T, dz3) / b_size
            db3 = np.sum(dz3, axis=0) / b_size
            
            da2 = np.dot(dz3, model.W3.T)
            dz2 = da2 * (z2 > 0)
            dW2 = np.dot(a1.T, dz2) / b_size
            db2 = np.sum(dz2, axis=0) / b_size
            
            da1 = np.dot(dz2, model.W2.T)
            dz1 = da1 * (z1 > 0)
            dW1 = np.dot(xb.T, dz1) / b_size
            db1 = np.sum(dz1, axis=0) / b_size
            
            grads = [dW1, db1, dW2, db2, dW3, db3]
            t_step += 1
            
            # Adam update
            for i in range(len(params)):
                m[i] = beta1 * m[i] + (1.0 - beta1) * grads[i]
                v[i] = beta2 * v[i] + (1.0 - beta2) * (grads[i] ** 2)
                m_hat = m[i] / (1.0 - (beta1 ** t_step))
                v_hat = v[i] / (1.0 - (beta2 ** t_step))
                params[i] -= lr * m_hat / (np.sqrt(v_hat) + eps)
                
    return model
