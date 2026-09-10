# Final Project Proposal

## A.N.T. - Academic Network and Talent Map Platform

**Case Study:** King Mongkut's University of Technology Thonburi (KMUTT)  
**Advisor:** Dr. Santawat Thanyadit

**Group Members**

- Kanokphathai Tangoon - 66070501064
- Chinatip Danaipiriya - 66070503415
- Thapana Liamthongkaow - 66070503416

> **Items to confirm:** the official project title, the department's proposal format, the primary target users, and the data sources that can be accessed and used.

---

# Section 1: Project Overview

## 1.1 Introduction and Problem Statement

Universities and organizations maintain different types of information about people and academic activities, including courses, projects, research, publications, certifications, skills, and work or internship experience. This information may be stored or presented in separate databases, systems, profiles, or documents. As a result, users may find it difficult to understand the relationships between a person's skills, academic activities, research work, and possible job roles [1].

For example, finding people with cybersecurity-related expertise may require users to inspect several types of information, such as courses, projects, research, publications, certifications, and work experience. It may also be difficult to determine what evidence supports a person's association with a particular skill. This can make it harder for lecturers, researchers, university administrators, and external stakeholders to identify suitable experts or potential collaborators [2], [3].

A.N.T. (Academic Network and Talent Map Platform) is proposed to make these relationships easier to explore. The platform will model people, academic information, skills, and job roles as a network. It will use an interactive Network Graph with a Force-Directed Layout as the primary visualization. Supporting visualizations, search, filtering, and detail views will help users inspect relevant parts of the network.

For instance, a user can search for cybersecurity and view related people, courses, projects, research, publications, certifications, and job roles such as SOC Analyst. The user can then inspect the evidence connected to a person's skill and compare the skill with the requirements of the selected job role. KMUTT will be used as the case study, while the data model and system architecture will be designed so that they can be adapted to other organizations in the future.

## 1.2 Problems to Be Addressed

1. Information about people, academic activities, research, and skills may be presented separately, making relationships between them difficult to understand.
2. Users may have difficulty identifying what information supports a person's skill or area of expertise.
3. Lecturers and researchers may have difficulty finding people with related expertise for possible academic or research collaboration.
4. University administrators may not have a clear visual overview of the expertise represented in the selected case study.
5. External stakeholders may have difficulty identifying suitable experts for research, funding, or collaboration.

The problems above describe the information and exploration problems that the platform aims to address. They do not assume that all KMUTT data are fragmented or that all data can be accessed by the project team. The available data and the final user groups will be confirmed during the data-source analysis.

## 1.3 Objectives

1. To model relationships between people, academic evidence, skills, research, and job roles in a structured data model.
2. To develop a platform that uses an interactive Network Graph with a Force-Directed Layout to visualize these relationships.
3. To allow users to search, filter, and explore people, skills, academic information, and related job roles.
4. To allow users to inspect the evidence supporting a person's skill, such as a course, project, research work, publication, certification, or work experience.
5. To compare the skills supported by the available evidence with the skills required for a selected job role, without using the result for automatic hiring or personnel evaluation.

## 1.4 Target Users and Stakeholders

### Primary Users

- **Lecturers and researchers:** Find people with related expertise and explore possible collaboration connections.
- **University administrators:** View an overview of expertise and relationships within the selected case study.

### Secondary Stakeholders

- **Students:** Explore courses, projects, skills, and career-related connections.
- **External organizations and industry:** Identify experts or academic connections for possible research and project collaboration.

> The primary user groups must be confirmed before the user evaluation plan is finalized. The first version may focus only on lecturers, researchers, and university administrators.

## 1.5 Project Scope

### 1.5.1 Data Scope

The initial version will focus on the following entities:

- People included in the selected KMUTT case study
- Skills and areas of expertise
- Courses and academic programs
- Projects
- Research and publications, when available
- Job roles and the skills required for those roles
- Supporting relationships between the entities

Certifications and work or internship experience may be included when the data are available, authorized, and suitable for use. The initial dataset may contain public data, authorized data, or prepared sample data, depending on the result of the data-source analysis.

### 1.5.2 System Scope

- A database for storing entities and relationships
- A backend API for managing and retrieving data
- A web frontend for presenting the information
- Search and filtering by topic, keyword, entity type, or relationship
- An interactive Network Graph using a Force-Directed Layout
- Highlighting and detail views for selected nodes and their evidence
- A skill-to-job-role comparison view
- Supporting charts or summaries where they improve understanding
- Basic evaluation of data correctness, graph comprehension, and usability

### 1.5.3 Initial Data Model

The initial network will use the following node types:

```text
Person, Skill, Course, Project, Research, Publication, Certification, Job Role
```

Possible relationships include:

```text
Person -> takes or teaches -> Course
Person -> works on -> Project
Person -> conducts -> Research
Person -> authors -> Publication
Person -> obtains -> Certification
Course -> supports -> Skill
Project -> supports -> Skill
Research -> relates to -> Skill
Job Role -> requires -> Skill
```

The project will define the criteria used to create a relationship. A skill should be connected to supporting evidence rather than being displayed only as an unverified label.

### 1.5.4 Out of Scope for the Initial Version

- Representing all KMUTT personnel or all university data
- Automatically deciding whether a person is suitable for employment
- Automatically ranking or evaluating a person's overall value
- Publishing personal or restricted information without authorization
- Requiring integration with production university systems when access has not been granted
- Claiming that the platform provides a clinical, hiring, or administrative decision

## 1.6 Project Plan

### First Semester

- Confirm the problem, target users, and project scope.
- Study related work on fragmented information, research networking, skill evidence, and network visualization.
- Identify and validate available KMUTT and external data sources.
- Design the data model, node-edge relationships, and system architecture.
- Design the user interface and interaction flow.
- Prepare a sample dataset and a basic graph prototype.

### Second Semester

- Implement the database, backend API, and frontend application.
- Implement search, filtering, node highlighting, and detail views.
- Implement the Force-Directed Network Graph and supporting visualizations.
- Implement the skill-to-job-role comparison feature.
- Test data correctness, system functions, and graph interaction.
- Conduct user evaluation and document the results and limitations.
- Prepare the final project report and presentation.

## 1.7 Expected Deliverables

- Project proposal and presentation
- Documented data model and node-edge relationship model
- Prepared sample or authorized dataset
- Working A.N.T. web platform
- Backend API and database
- Interactive Network Graph with search, filtering, and highlighting
- Person, skill, evidence, and job-role detail views
- Skill-to-job-role comparison feature
- System testing and user-evaluation results
- Final project report and presentation

---

# Section 2: Background and Related Work

## 2.1 Fragmented Information in Higher Education

Higher-education organizations use many data sources for analysis and decision-making. When users need to work with information from different systems, access, data definitions, understandability, and data use can become challenges [1]. This supports the need to study how different types of academic information can be connected and presented in a form that users can explore.

The present project does not assume that KMUTT has one specific fragmentation problem without evidence. Instead, it will first analyze the available sources and document which data can be connected in the case study.

## 2.2 Researcher and Expertise Discovery

Finding suitable researchers for university-industry collaboration can be difficult because organizations may not have enough information about researchers' expertise or may not know where to find relevant information [2]. Research networking systems have also been studied as tools for helping users find collaborators by organizing researchers, interests, publications, grants, and collaboration information [3].

These studies support the talent-discovery use case of A.N.T. However, A.N.T. also includes academic evidence and job-role requirements so that users can inspect why a person is connected to a skill and how the skill relates to industry needs.

## 2.3 Skill Evidence and Job-Role Requirements

In A.N.T., a skill is not intended to be an unsupported label. It should be connected to evidence such as a course, project, research work, publication, certification, internship, or work experience. This evidence-based model can help users inspect the basis of a person's skills.

On the industry side, a job role can be represented by a set of required skills. The platform can compare the skills supported by the available evidence with the requirements of a selected job role. This comparison is intended to support exploration and skill-gap discussion; it is not intended to make automatic hiring or personnel decisions.

## 2.4 Network Graph and Force-Directed Layout

A network graph represents entities as nodes and relationships as edges. This makes it suitable for questions such as:

- Which people are connected to a selected skill?
- What courses, projects, or research support that skill?
- Which people or projects are related to one another?
- Which job roles require the selected skill?

A Force-Directed Layout positions nodes using attractive forces between connected nodes and repulsive forces between nodes. Related nodes may appear closer together, which can help users inspect clusters and local relationships. Academic network visualization systems have used force-directed graphs to support interactive exploration of authors, publications, and relationships [4]. ForceAtlas2 is another force-directed layout approach designed for interactive network visualization [5].

Force-directed layouts also have limitations. A large graph can become difficult to read, the final layout can change depending on initial conditions and parameters, and node positions do not represent ordinary x- and y-axis values. Therefore, A.N.T. will include search, filtering, highlighting, and possibly aggregation or clustering to show a smaller relevant subnetwork.

## 2.5 Related Work and Research Gap

Existing research covers different parts of the proposed problem. Some studies focus on fragmented higher-education databases, researcher recommendation, collaborator discovery, academic network visualization, or force-directed layouts. These studies show useful approaches for understanding academic information and relationships.

However, these areas are usually studied separately. A.N.T. proposes to combine people, academic evidence, projects, research, publications, skills, and job-role requirements in one interactive university talent network. This project will evaluate whether this combined representation helps target users explore relationships and understand the evidence connected to skills. The project will not claim that no similar system exists; the final research gap will be refined after a broader related-work review.

---

# Section 3: Preliminary System Design

## 3.1 System Architecture

```text
KMUTT / External Data Sources
            |
    Data Preparation and Validation
            |
   Database and Relationship Model
            |
         Backend API
      /       |        \
   Search  Filtering  Skill Matching
            |
   Frontend and Network Graph
            |
          End Users
```

The system will import or prepare data from approved sources, store entities and relationships in the database, and provide the data through a backend API. The frontend will allow users to search and filter the network, inspect selected nodes, and view supporting evidence and job-role connections.

## 3.2 Main User Flow

```text
Search for a topic or skill
        |
Filter by entity type or relationship
        |
View the relevant subnetwork
        |
Select a person or skill
        |
Inspect supporting evidence
        |
Compare with a selected job role
```

## 3.3 Main Use Cases

### Talent Discovery

The user searches for a skill such as cybersecurity and views related people and the evidence connected to that skill.

### Collaboration Discovery

The user explores people, projects, and research topics to identify possible connections for academic or research collaboration.

### Skill-to-Job-Role Comparison

The user selects a job role such as SOC Analyst and compares its required skills with the skills represented by the available evidence.

## 3.4 Technology Selection

The final technologies will be selected after considering team experience, graph-library support, data requirements, deployment constraints, and the department's expectations.

Possible components include:

- Frontend framework: to be confirmed
- Backend framework: to be confirmed
- Database: to be confirmed based on the final relationship model
- Graph visualization library: to be confirmed
- Data preparation tools: to be confirmed

---

# Section 4: Methodology and Evaluation

## 4.1 Methodology

1. Review the problem, user requirements, and related research.
2. Identify available KMUTT and external data sources and check access permissions.
3. Define the data entities, relationship types, and criteria for supporting evidence.
4. Prepare, clean, and validate the initial dataset.
5. Design the system architecture, user interface, and network interactions.
6. Implement the database, backend API, frontend, graph visualization, and search functions.
7. Implement and test the skill-to-job-role comparison feature.
8. Evaluate data correctness, system functions, graph understanding, and usability.
9. Document the results, limitations, privacy considerations, and possible future improvements.

## 4.2 Evaluation Plan

### Functional and Data Evaluation

- Check whether search and filtering return the expected records.
- Check whether graph relationships match the prepared source data.
- Test whether each displayed skill has the expected supporting evidence.
- Test the skill-to-job-role comparison using predefined examples.

### Task-Based User Evaluation

Target users will be asked to complete tasks such as:

1. Find people related to a selected skill.
2. Identify the evidence supporting a person's skill.
3. Find a related course, project, or research work.
4. Compare the available skills with a selected job role.

The evaluation will record task success rate, task completion time, and users' understanding of the displayed relationships.

### Usability Evaluation

Usability may be evaluated using a questionnaire such as the System Usability Scale (SUS), together with short questions about readability, ease of navigation, and usefulness of the graph. The final number of participants, recruitment method, and evaluation criteria must be confirmed with the advisor.

### Technical Limitations

The evaluation will also record incomplete data, duplicate records, incorrect or uncertain relationships, graph readability, and response performance as the number of nodes and edges increases.

---

# Section 5: Risks and Limitations

- KMUTT data may not be publicly available or may require permission.
- The initial dataset may not represent all people or expertise in KMUTT.
- Data from different sources may use different formats or names and may require cleaning and entity matching.
- The criteria for connecting skills with evidence may require review by a domain expert.
- A large number of nodes and edges may make the graph difficult to read.
- Job-role requirements may vary between sources and may change over time.
- Personal data must be handled according to applicable permissions and privacy requirements.
- The system will support exploration and visualization; it will not provide automatic hiring, personnel evaluation, or guaranteed expertise decisions.

---

# Section 6: Preliminary References

[1] A. Briggs and F. Cafaro, “End-User Needs of Fragmented Databases in Higher Education Data Analysis and Decision Making,” *Informatics*, vol. 8, no. 3, p. 42, 2021. doi: 10.3390/informatics8030042.

[2] Q. Wang, J. Ma, X. Liao, and W. Du, “A Context-Aware Researcher Recommendation System for University-Industry Collaboration on R&D Projects,” *Decision Support Systems*, vol. 103, pp. 46–57, 2017. doi: 10.1016/j.dss.2017.09.001.

[3] C. D. Borromeo, T. K. Schleyer, M. J. Becich, and H. Hochheiser, “Finding Collaborators: Toward Interactive Discovery Tools for Research Network Systems,” *Journal of Medical Internet Research*, vol. 16, no. 11, p. e244, 2014. doi: 10.2196/jmir.3444.

[4] K. A. M. Aris, C. Ramasamy, T. N. M. Aris, and M. Zolkepli, “Dynamic Force-directed Graph with Weighted Nodes for Scholar Network Visualization,” *International Journal of Advanced Computer Science and Applications*, vol. 13, no. 12, pp. 756–763, 2022. doi: 10.14569/IJACSA.2022.0131289.

[5] M. Jacomy, T. Venturini, S. Heymann, and M. Bastian, “ForceAtlas2, a Continuous Force-Directed Graph Layout Algorithm for Handy Network Visualization Designed for the Gephi Software,” *PLOS ONE*, vol. 9, no. 6, p. e98679, 2014. doi: 10.1371/journal.pone.0098679.

---

# Items to Confirm Before Submission

- [ ] Confirm the official project title and department format.
- [ ] Confirm the primary target users.
- [ ] Confirm the initial KMUTT data source and access permission.
- [ ] Reduce or expand the data scope according to the available data.
- [ ] Select the actual technology stack.
- [ ] Define the number of user-evaluation participants and recruitment method.
- [ ] Define the final evaluation metrics and tasks.
- [ ] Confirm privacy and ethical requirements.
- [ ] Complete the related-work review and refine the research gap.
- [ ] Check all references and citation formatting.
