import json

GLOSSARY_TERMS = [
    {
        "term": "Directed Acyclic Graph (DAG)",
        "query": "DAG",
        "category": "Causal Inference",
        "description": "A graphical representation of causal models showing dependencies."
    },
    {
        "term": "Markov Chain Monte Carlo (MCMC)",
        "query": "MCMC",
        "category": "Inference Algorithms",
        "description": "A class of algorithms for sampling from a posterior probability distribution."
    },
    {
        "term": "Prior Distribution",
        "query": "prior",
        "category": "Bayesian Basics",
        "description": "A distribution representing parameter plausibility before observing data."
    },
    {
        "term": "Posterior Distribution",
        "query": "posterior",
        "category": "Bayesian Basics",
        "description": "The updated probability distribution of a parameter after observing the data."
    },
    {
        "term": "Collider Bias",
        "query": "collider",
        "category": "Causal Inference",
        "description": "Spurious association created when two variables independently influence a third variable (the collider), and you condition on the collider."
    },
    {
        "term": "Confounding",
        "query": "confound",
        "category": "Causal Inference",
        "description": "A variable that influences both the treatment and outcome variable, causing spurious association."
    },
    {
        "term": "Regularization",
        "query": "regularization",
        "category": "Model Building",
        "description": "Adding a penalty or informative prior to a model to prevent overfitting."
    },
    {
        "term": "Simpson's Paradox",
        "query": "simpson's paradox",
        "category": "Data Anomalies",
        "description": "A phenomenon where a trend appears in different groups of data but disappears or reverses when groups are combined."
    },
    {
        "term": "Multilevel Model",
        "query": "multilevel",
        "category": "Model Extensions",
        "description": "Statistical models with parameters that vary at more than one level (e.g., hierarchical data)."
    },
    {
        "term": "WAIC / LOO",
        "query": "WAIC",
        "category": "Model Comparison",
        "description": "Metrics used for estimating out-of-sample deviance to compare model predictive accuracy."
    },
    {
        "term": "Instrumental Variable",
        "query": "instrumental variable",
        "category": "Causal Inference",
        "description": "A variable used to estimate causal relationships when controlled experiments are not feasible or when a treatment is not successfully delivered to every unit."
    },
    {
        "term": "Backdoor Criterion",
        "query": "backdoor",
        "category": "Causal Inference",
        "description": "A graphical test that determines which variables need to be conditioned on to identify a causal effect."
    }
]

def main():
    # Write glossary terms to glossary.json
    with open('glossary.json', 'w', encoding='utf-8') as f:
        json.dump(GLOSSARY_TERMS, f, indent=2, ensure_ascii=False)
    print("Glossary written to glossary.json")

if __name__ == '__main__':
    main()
