import requests
from typing import Dict

from .pubmed_search import PubmedSearchAgent
from .tavily_search import TavilySearchAgent

class WebSearchAgent:
    """
    Agent responsible for retrieving real-time medical information from web sources.
    """
    
    def __init__(self, config=None):
        self.tavily_search_agent = TavilySearchAgent()
        self.pubmed_search_agent = PubmedSearchAgent()
        self.pubmed_api_url = getattr(config, 'pubmed_api_url', 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi') if config else 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi'
    
    def search(self, query: str) -> str:
        """
        Perform medical-specific PubMed and general web searches.
        """
        tavily_results = self.tavily_search_agent.search_tavily(query=query)
        pubmed_results = self.pubmed_search_agent.search_pubmed(self.pubmed_api_url, query)
        
        return f"PubMed Medical Articles:\n{pubmed_results}\n\nGeneral Web Results:\n{tavily_results}"
