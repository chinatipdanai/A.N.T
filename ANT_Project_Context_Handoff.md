# A.N.T. Project Context Handoff

> Use this file as context when starting a new ChatGPT/Codex CLI session.

## 1. Project Overview

**Project name:** A.N.T. — Academic Network & Talent Map Platform  
**Initial case study:** KMUTT  
**Project type:** Senior Project / Final Project  
**Current phase:** Project Idea / Proposal preparation  
**Main technical direction:** Data Visualization using an interactive **Network Graph with a Force-Directed Layout**

Core concept:

```text
People + Academic + Projects + Research + Publications + Skills + Job Roles
↓
Model relationships as a network
↓
Interactive Network Graph
↓
Force-Directed Layout
↓
Explore talent, skill evidence, collaboration, research connections, industry requirements
```

A.N.T. is not only a skill list or dashboard. The main point is to make relationships between different types of university data easier to explore.

---

## 2. Main Problem Direction

Do **not** frame the project as:

- "There is a lot of data."
- "Data is scattered everywhere."
- "We will build a platform first and find a problem later."

The project should start from a real problem.

Current problem framing:

- Universities have many types of information about people, courses, projects, research, publications, certifications, internship/work experience, and skills.
- When these types of information are separated into different systems, records, lists, or profiles, relationships between them can be difficult to understand.
- This can make it harder to see available expertise, find suitable researchers/collaborators, understand why a person is associated with a skill, or connect academic skills with job requirements.
- A.N.T. uses Data Visualization to make these relationships visible.

Important:

- Do not overclaim.
- Do not say KMUTT data is definitely "scattered" unless supported by evidence.
- Prefer wording like **fragmented databases**, **separated information**, or **information stored/presented in different systems**, when supported by references.

---

## 3. Main Data Relationships

Current planned entities:

```text
Person
Skill
Course
Project
Research
Publication
Certification
Internship / Work Experience
Job Role
```

Possible relationships:

```text
Person → takes/teaches → Course
Person → works_on → Project
Person → conducts → Research
Person → authors → Publication
Person → obtains → Certification
Person → has experience → Internship / Work
Course → supports → Skill
Project → supports → Skill
Research → relates_to → Skill
Publication → relates_to → Skill
Person → has → Skill
Job Role → requires → Skill
```

Core flow:

```text
Person
↓
Academic / Project / Research / Experience Evidence
↓
Skill
↓
Job Role / Industry Requirement
```

Skill/talent should not be a floating label. It should have **supporting evidence**.

Examples of supporting evidence:

- Course
- Project
- Research
- Publication
- Certification
- Internship
- Work Experience

---

## 4. Why Network Graph / Force-Directed Layout

**Network Graph** = visualization type.  
**Force-Directed Layout** = method for positioning nodes in a network graph.

Basic idea:

```text
Connected nodes → attractive force
Nodes in general → repulsive force
↓
Related nodes tend to appear closer
↓
Clusters / communities / relationships become easier to inspect
```

Main benefit for A.N.T.:

The important question is:

> "Who/what is connected to what?"

Examples:

- Who has Cybersecurity skills?
- What evidence supports that skill?
- Which courses/projects/research are connected to it?
- Who has similar expertise?
- Which job roles require that skill?

Force-Directed is the **main visualization**, but other visualizations can support it.

Possible supporting visualizations:

- Bar chart → count/ranking
- Heatmap → comparison
- Table → exact detail
- Skill gap view → available vs required skills

Do not claim Force-Directed is perfect.

Known limitations:

- Large graph can become a hairball.
- Layout can depend on initial state.
- May get stuck in local minimum.
- X/Y position does not represent a normal numeric axis.
- Different layout algorithms may produce different readability.
- Need search/filter/highlight/cluster/aggregation.

Likely UX direction:

```text
Search / Select topic
↓
Filter
↓
Show only relevant subnetwork
```

Example:

```text
Search: Cybersecurity
↓
Show related:
People
Courses
Projects
Research
Publications
Certifications
Job Roles
```

---

## 5. Advisor Feedback Collected So Far

Important advisor comments / direction:

- Problem must come first.
- Do not start from "build a platform".
- "Universities and organizations have a lot of data" → specify what data.
- "Data stored in different places" → what data? how do you know?
- "Talent/Skill" → based on what evidence?
- "Industry needs" → specify actual requirements/job roles.
- Objective should show what success looks like, not only list actions.
- Do not make the project only a clickable mockup.
- A real platform must be developed.
- Data Visualization is the main work.
- Keyword from advisor: **Force-Directed Graph / Network Graph**
- Find examples of other universities/systems using Force-Directed.
- Study advantages and disadvantages.
- Find examples similar to our project.
- Find public data sources.
- Show main relationships in the objective.
- Use simple direct wording. Do not use exaggerated AI-style wording.
- "Use AI words too much / wording is too grand" → write directly and clearly.
- Find examples of existing work and explain why they are useful.
- Current commented Project Idea also suggests:
  - explain the effect of data silos / fragmented information
  - use the word **stakeholders**
  - mention a **combination of data visualizations**
  - use Force-Directed as main visualization, not necessarily the only one
  - add **Identified Problems**
  - Objective should be a list
  - use KMUTT as **a case study**, not "the first case study"

---

## 6. Current Idea of Project & Background Direction

Latest recommended version:

```text
Universities and organizations have different types of information about their people, such as academic programs, courses, projects, certifications, internship experience, research, publications, and skills. In higher education, these data may come from different databases or systems, which can make the information more difficult to access, understand, and use for decision-making [1].

This can create difficulties when trying to understand the expertise and relationships within an organization. It can also make it difficult to identify suitable researchers or collaborators. Previous studies have shown that finding suitable university researchers is one of the challenges in university-industry collaboration, especially when information about researchers and their expertise is difficult to identify [2]. Research networking systems have also been studied as a way to help researchers find collaborators with suitable expertise [3].

To reduce these problems, A.N.T. (Academic Network & Talent Map Platform) is proposed to connect and visualize relationships between people, skills, courses, projects, research, publications, and job roles. The platform will use a combination of data visualizations, with an interactive Network Graph using a Force-Directed Layout as the main visualization. Force-directed graphs have been used to visualize academic networks and help users explore connections between related academic information [4]. The layout can also help show network structure by placing connected nodes based on their relationships [5].

For example, A.N.T. can show people related to cybersecurity together with their courses, projects, research, certifications, and relevant job roles such as SOC Analyst. This allows stakeholders to see who has related skills, what information supports those skills, and how people, academic activities, and job requirements are connected.

KMUTT will be used as a case study for the project. The platform will be designed so that it can later be adapted for other universities or organizations.
```

Important:

- This is **not exactly the original wording**.
- It was changed to better match advisor feedback and add references.
- The core project idea remains the same.

---

## 7. Identified Problems

Current draft:

```text
1. Information about people, academic activities, skills, and research is presented separately, making relationships between the data difficult to see.

2. University executives may not have a clear overview of expertise available within the university.

3. Information barriers can make it difficult to identify possible academic and research collaboration.

4. External stakeholders may have difficulty finding suitable experts for research, funding, or collaboration.

5. Students may have difficulty finding information about university partnerships and relevant academic contacts.
```

Important:

- Problem #5 about students / university partnerships still needs a stronger direct reference if kept.
- If no source is found, remove or soften it.

---

## 8. Current Objective

Latest direction:

```text
- To clearly represent talent and skills based on supporting evidence such as courses, projects, research, publications, certifications, and work or internship experience.

- To allow stakeholders to understand the relationships between people, skills, academic activities, research, and job roles.

- To help stakeholders identify people with related expertise and understand what information supports their skills.

- To compare existing skills with skills required for specific job roles and identify areas that may need further development.
```

Earlier paragraph version:

```text
The objective of A.N.T. is to develop a platform that can clearly represent and visualize talent and skills based on evidence such as courses, projects, research, publications, certifications, and work or internship experience. The platform should allow users to understand why a person is connected to a particular skill, explore relationships between people with similar skills, compare existing skills with the skills required for specific job roles, and identify areas where skills are strong or need further development.
```

Advisor prefers the objective as a **list**.

---

## 9. Current Scope of Work

Preferred format: simple bullets, similar to other groups. Do not split into 6 subheadings unless needed.

Current draft:

```text
- Identify the data needed to represent people, skills, courses, projects, research, publications, and job roles, including the relationships between them.

- Study relevant KMUTT and external data sources, including their availability, access, and limitations.

- Design an interactive Network Graph using a Force-Directed Layout to show relationships between people, skills, academic information, research, and industry job requirements.

- Develop the A.N.T. platform, including the database, frontend, backend, search, filtering, and interactive data visualization, with KMUTT as a case study.

- Evaluate whether the platform can clearly show talent, supporting evidence for skills, and relationships between academic information and job requirements, and identify limitations of the platform.
```

Changes already made:

- `Student–Skill` → prefer **Person–Skill**
- `Industry–Skill` → prefer **Job Role–Skill**
- Force-Directed = core visualization
- Other charts = supporting visualizations
- `first case study` → **a case study**

---

## 10. Current Expected Results

Current draft:

```text
- A working A.N.T. platform that visualizes relationships between people, skills, courses, projects, research, publications, and job roles.

- An interactive Network Graph using a Force-Directed Layout that allows users to explore related people, skills, and supporting evidence.

- A clearer view of talent and skill relationships within KMUTT, including connections to relevant industry job requirements.

- Evaluation results showing whether users can understand the relationships and information presented by the platform.

- Identified limitations of the data and platform that can be used for further improvement or adaptation to other organizations.
```

Expected Result = what should exist / what outcome should be observed at the end, not a task list.

---

## 11. Main Use Cases

### Talent Discovery

Question:

```text
Who has cybersecurity-related expertise, and what evidence supports it?
```

Example network:

```text
Cybersecurity
├─ Person A
│  ├─ Course
│  ├─ Project
│  └─ Certification
├─ Person B
│  ├─ Research
│  └─ Publication
└─ SOC Analyst
   └─ Required Skills
```

### Collaboration Discovery

```text
Researcher A
→ AI Security
← Student B
→ Project X
← Researcher C
```

### Skill Gap

```text
Existing Skill
vs
Job Required Skill
↓
Identify missing/weak areas
```

---

## 12. Related Work — Strongest Papers

### Main Related Work

#### 1. Generating Unified Candidate Skill Graph for Career Path Recommendation
Strong match.

Useful because it connects:

```text
Person/Profile
→ Education / Courses / Publications / Experience
→ Skill
→ Career / Job Role
```

Important points:

- Extracts education, academic details, courses, publications/patents, internships/jobs, projects/responsibilities.
- Builds skill ontology using O*NET, ComputerHope, Wikipedia, university curriculum, MIT OCW, edX.
- Shows that skills can be supported by education and experience.
- Useful for A.N.T. evidence model.

Limitation:

- Focused on individual career recommendation.
- Not organization-wide academic talent visualization.

#### 2. Job Posting-Enriched Knowledge Graph for Skills-based Matching
Strong for industry side.

Useful because it connects:

```text
Skill ↔ Occupation / Job Role
```

Uses:

- ESCO
- ISCO
- ~600,000 Dutch job postings

Useful for:

- Skill ↔ Job Role
- Industry demand
- Skill gap
- External job requirements

Limitation:

- No academic Person/Course/Project/Research evidence layer.

#### 3. Academic Origin Structure and Mobility Network of Technological Talent in Chinese Universities
Strong academic talent/network example.

Uses:

- Talent
- University
- Education/work history
- Social Network Analysis
- Pajek

Useful because it shows talent information can be modeled and studied as a network.

Limitation:

```text
Their focus:
Talent → University → Mobility

A.N.T.:
Person → Evidence → Skill → Industry
```

### Supporting Related Work

#### 4. A Survey of Scholarly Data Visualization
Useful for scholarly network visualization background.

Includes:

- Author
- Paper
- Institution
- Research Field
- Citation
- Network visualization
- ForceAtlas2 / Gephi / VOSviewer / CiteSpace etc.

#### 5. Learning Multi-Graph Neural Network for Data-Driven Job Skill Prediction
Useful for:

```text
Job ↔ Job
Skill ↔ Skill
Job ↔ Skill
```

Supports the idea that skills are relational, not isolated labels.

---

## 13. Force-Directed Research — Strongest Papers

### Dynamic Force-directed Graph with Weighted Nodes for Scholar Network Visualization
Very relevant.

Why:

- Academic/scholar domain
- Web-based
- D3.js
- Fruchterman-Reingold
- Weighted nodes/edges
- Search
- Highlight
- Hover details

Useful for A.N.T.:

```text
Academic data
→ Network
→ Force-Directed
→ Interactive exploration
```

### ForceAtlas2, a Continuous Graph Layout Algorithm for Handy Network Visualization Designed for Gephi
Very important for methodology.

Key points:

- Nodes repel.
- Edges attract.
- Structural proximity becomes visual proximity.
- Helps show communities/clusters.
- Interactive/continuous layout.
- Supports edge weight, scaling, gravity, overlap prevention.

Limitations:

- Initial layout affects result.
- Can get stuck in local minima.
- Not deterministic.
- Node coordinates do not represent normal X/Y variables.

### Force-Directed Graph Layouts Revisited: A New Force Based on the T-Distribution
Useful for limitations of traditional FDP.

Key point:

- Traditional spring-electric models may not preserve local neighborhoods well.
- Connected nodes can sometimes be visually separated.
- Shows why layout algorithm selection matters.

### A Qualitative Analysis on Force Directed Network Visualization Tools in the Context of Large Complex Networks
Useful for comparison.

Compares:

- Gephi
- Python / NetworkX
- R / iGraph
- ForceAtlas2
- Fruchterman-Reingold

Useful for:

- performance
- scalability
- visual quality
- tool selection

### Force2Vec / Scalable Force-Directed Graph Representation Learning and Visualization
Technical backup.

Useful for:

- large graph scalability
- attractive/repulsive force model
- graph embedding

Not main A.N.T. Related Work because it focuses more on ML/embedding.

### FORG3D
Supporting example only.

Biology domain, but useful to show:

- integrated data
- force-directed visualization
- node/edge attributes
- interactive drag/zoom/exploration

---

## 14. Papers Previously Rejected / Backup Only

Do not use these as main A.N.T. Related Work:

- Skill Discovery for Exploration and Planning using Deep Skill Graphs
  - "Skill" = reinforcement learning agent skill, not human skill.

- Graph-of-Skills: Dependency-Aware Structural Retrieval for Massive Agent Skills
  - "Skill" = LLM agent package/ability, not human skill.

- Automatic Skill Acquisition in Reinforcement Learning using Connection Graph Stability Centrality
  - "Skill" = RL behavior/options.

- Yoga knowledge graph / CiteSpace paper
  - usable only as supplementary academic network visualization.

- Academic Emotion / knowledge visualization paper
  - backup only.

- Higher Education and Global Talent Flows
  - background only; no Network Graph / Force-Directed.

- International Networks and Flows of Academic Talent
  - background only.

- Government-Industry-University-Research collaboration via game theory
  - background/problem support only.

- University entrepreneurial ecosystem paper
  - useful for complex university ecosystem/background, not main visualization paper.

---

## 15. References Currently Suggested for Project Idea

### [1] Fragmented databases / higher education decision-making

A. Briggs and F. Cafaro,  
**“End-User Needs of Fragmented Databases in Higher Education Data Analysis and Decision Making,”**  
*Informatics*, vol. 8, no. 3, p. 42, 2021.  
DOI: 10.3390/informatics8030042

Use for:

- fragmented databases
- access
- understanding
- data use
- decision-making

### [2] Finding suitable university researchers for industry collaboration

Q. Wang, J. Ma, X. Liao, and W. Du,  
**“A Context-Aware Researcher Recommendation System for University-Industry Collaboration on R&D Projects,”**  
*Decision Support Systems*, vol. 103, pp. 46–57, 2017.  
DOI: 10.1016/j.dss.2017.09.001

Use for:

- difficulty identifying suitable university researchers
- university-industry collaboration
- researcher expertise discovery

### [3] Finding collaborators

C. D. Borromeo, T. K. Schleyer, M. J. Becich, and H. Hochheiser,  
**“Finding Collaborators: Toward Interactive Discovery Tools for Research Network Systems,”**  
*Journal of Medical Internet Research*, vol. 16, no. 11, p. e244, 2014.  
DOI: 10.2196/jmir.3444

Use for:

- collaborator discovery
- research networking systems

### [4] Academic Force-Directed visualization

K. A. M. Aris, C. Ramasamy, T. N. M. Aris, and M. Zolkepli,  
**“Dynamic Force-directed Graph with Weighted Nodes for Scholar Network Visualization,”**  
*International Journal of Advanced Computer Science and Applications*, vol. 13, no. 12, 2022.

Use for:

- academic network visualization
- D3
- Fruchterman-Reingold
- interactive scholar graph

### [5] ForceAtlas2

M. Jacomy, T. Venturini, S. Heymann, and M. Bastian,  
**“ForceAtlas2, a Continuous Graph Layout Algorithm for Handy Network Visualization Designed for the Gephi Software,”**  
*PLOS ONE*, vol. 9, no. 6, p. e98679, 2014.  
DOI: 10.1371/journal.pone.0098679

Use for:

- force-directed method
- network structure
- communities
- pros/cons

---

## 16. Files/Papers Uploaded in Previous Chat

Important uploaded papers/files:

```text
Project Idea_ant_commented.pdf
Project Idea_ABTesting.pdf
Project Ideas_optimization.pdf

Dynamic Force-directed Graph with Weighted Nodes for Scholar Network Visualization
Force2Vec_Parallel_Force-Directed_Graph_Embedding.pdf
s10115-021-01634-9.pdf
ForceAtlas2 paper
Force-Directed_Graph_Layouts_Revisited_A_New_Force_Based_on_the_T-Distribution.pdf
A_Qualitative_Analysis_on_Force_Directed_Network_Visualization_Tools_in_the_Context_of_Large_Complex_Networks.pdf
1752-0509-3-26.pdf (FORG3D)

Generating Unified Candidate Skill Graph for Career Path Recommendation
Job Posting-Enriched Knowledge Graph for Skills-based Matching
Learning Multi-Graph Neural Network for Data-Driven Job Skill Prediction
Academic Origin Structure and Mobility Network of Technological Talent in Chinese Universities
A Survey of Scholarly Data Visualization
```

When working in Codex CLI, re-upload/copy the relevant papers if exact quotations, page references, or verification are needed.

---

## 17. Writing Style Required

Very important.

For project writing:

- English.
- Should look like a **student wrote it**.
- Formal written language, not spoken language.
- Do not sound like AI.
- Avoid overly polished or grand wording.
- Use simple direct sentences.
- Avoid words like:
  - leverage
  - comprehensive
  - robust
  - seamless
  - facilitate
  - empower
  - cutting-edge
  - revolutionary
- Do not overclaim.
- Do not use "the first platform" unless verified.
- Keep explanations clear and defensible.
- Prefer specific terms over vague terms.

Examples:

Bad:

```text
The platform leverages advanced visualization techniques to empower stakeholders with comprehensive insights.
```

Better:

```text
The platform uses network visualization to show relationships between people, skills, academic activities, research, and job roles.
```

Conversation replies to the user:

- Thai.
- Short and direct.
- User often wants **caveman mode ULTRA**.
- Start replies with **TL;DR**.
- For project text, still write normal formal English even if the chat reply is compressed.

---

## 18. Current Priority

Do not jump ahead into coding yet unless requested.

Current order:

```text
1. Finish Project Idea
   - Idea of Project & Background
   - Identified Problems
   - Objectives
   - Scope of Work
   - Expected Results
   - References

2. Get advisor approval / fix comments

3. Related Work / Research Gap

4. Data source validation / KMUTT public data

5. Data model / Node-Edge design

6. Visualization design / Force-Directed experiments

7. UX/UI

8. Platform implementation
```

Current highest priority: **finish the Project Idea document first**.

---

## 19. Research Gap Direction

Do not claim this as proven unique unless more research is done.

Current safe framing:

Existing works handle parts separately:

```text
Candidate Profile → Skill → Career
Skill ↔ Occupation / Industry
Talent ↔ University / Mobility
Author ↔ Paper ↔ Institution
Scholar Network Visualization
```

A.N.T. proposes to combine:

```text
Person
+
Academic Evidence
+
Projects
+
Research / Publications
+
Skills
+
Job Roles / Industry Requirements
↓
One interactive university talent network
```

Possible research gap wording:

> Existing studies show different ways to model candidate skills, academic networks, researcher relationships, and job-skill connections. However, these approaches usually focus on one part of the problem. A.N.T. proposes to connect academic evidence, people, skills, research, and job requirements in one interactive network for exploring talent within a university context.

Do not say:

> "No existing system does this."

unless verified.

---

## 20. Key Decision Summary

```text
Project = A.N.T.
Case study = KMUTT

Main problem =
relationships between different types of talent/academic information are difficult to explore when information is separated

Main solution =
connect data as a network

Core visualization =
Interactive Network Graph

Layout =
Force-Directed

Skill must have evidence =
Course / Project / Research / Publication / Certification / Internship / Work

Industry side =
Job Role → Required Skills

Main use =
Talent discovery
Skill evidence
Collaboration discovery
Academic/research relationship
Industry connection
Skill gap

Main concern =
graph complexity / hairball
→ search + filter + highlight + cluster

Writing =
simple student-written formal English
no AI-sounding wording
no overclaim
```
