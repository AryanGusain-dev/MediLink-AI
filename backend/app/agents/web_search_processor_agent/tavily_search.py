import os
import requests
from langchain_community.tools.tavily_search import TavilySearchResults

class TavilySearchAgent:
    """
    Processes general documents for the RAG system with context-aware chunking.
    """
    def __init__(self):
        """
        Initialize the Tavily search agent.
        
        Args:
            query: User query
        """
        pass

    def search_tavily(self, query: str) -> str:
        if not os.getenv("TAVILY_API_KEY"):
            return "Tavily API key not configured. Using alternative search methods."

        try:
            tavily_search = TavilySearchResults(max_results=5)
            query = query.strip('"\'')
            search_docs = tavily_search.invoke(query)
            if len(search_docs):
                return "\n".join(["title: " + str(res["title"]) + " - " + 
                                  "url: " + str(res["url"]) + " - " + 
                                  "content: " + str(res["content"]) + " - " + 
                                  "score: " + str(res["score"]) for res in search_docs])
            return "No relevant results found."
        except Exception as e:
            return f"Error retrieving web search results: {e}"