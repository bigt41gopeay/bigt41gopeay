"""Crew definitions and construction.

This module is the single place where CrewAI agents, tasks, and crews are
declared. Add new crews here; the API and dashboard discover them automatically
through :data:`CREW_REGISTRY`.

CrewAI is imported lazily so the API can boot (and the dashboard can render)
even in environments where the heavy ``crewai`` dependency or an LLM key is not
available — in that case the run manager falls back to a simulated execution
useful for local development and demos.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class CrewDefinition:
    id: str
    name: str
    description: str
    agent_names: list[str]
    task_names: list[str]
    # Builder returns a configured crewai.Crew given the run inputs.
    builder: Callable[[dict[str, str]], Any] = field(repr=False)


def crewai_available() -> bool:
    try:
        import crewai  # noqa: F401
    except Exception:
        return False
    return True


def _build_research_crew(inputs: dict[str, str]) -> Any:
    """A two-agent research → writing crew.

    Only imported/constructed when CrewAI is installed and a run is actually
    requested, so importing this module never forces the heavy dependency.
    """
    from crewai import Agent, Crew, Process, Task

    topic = inputs.get("topic", "the requested subject")

    researcher = Agent(
        role="Senior Research Analyst",
        goal=f"Uncover accurate, up-to-date insights about {topic}",
        backstory=(
            "A meticulous analyst who values primary sources and clearly "
            "separates established fact from speculation."
        ),
        allow_delegation=False,
        verbose=True,
    )
    writer = Agent(
        role="Technical Writer",
        goal=f"Produce a clear, well-structured brief on {topic}",
        backstory=(
            "An editor who turns dense findings into concise, accurate prose "
            "for a technical audience."
        ),
        allow_delegation=False,
        verbose=True,
    )

    research_task = Task(
        description=(
            f"Research {topic}. Identify the most important, verifiable facts "
            "and recent developments. Cite reasoning."
        ),
        expected_output="A bullet list of key findings with brief justifications.",
        agent=researcher,
    )
    writing_task = Task(
        description=(
            f"Using the research findings, write a concise brief on {topic} "
            "for a technical reader."
        ),
        expected_output="A 3-5 paragraph brief.",
        agent=writer,
        context=[research_task],
    )

    return Crew(
        agents=[researcher, writer],
        tasks=[research_task, writing_task],
        process=Process.sequential,
        verbose=True,
    )


CREW_REGISTRY: dict[str, CrewDefinition] = {
    "research_brief": CrewDefinition(
        id="research_brief",
        name="Research & Brief",
        description=(
            "A research analyst gathers findings on a topic and a technical "
            "writer turns them into a concise brief."
        ),
        agent_names=["Senior Research Analyst", "Technical Writer"],
        task_names=["Research the topic", "Write the brief"],
        builder=_build_research_crew,
    ),
}


def list_crews() -> list[CrewDefinition]:
    return list(CREW_REGISTRY.values())


def get_crew_definition(crew_id: str) -> CrewDefinition | None:
    return CREW_REGISTRY.get(crew_id)
