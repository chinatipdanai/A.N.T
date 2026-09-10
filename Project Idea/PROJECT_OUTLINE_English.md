# A.N.T. - Academic Network & Talent Map Platform

Project Proposal Outline for Computer Engineering Capstone Project

## 1. Project Information

- **Project Title:** A.N.T. - Academic Network & Talent Map Platform
- **Case Study:** King Mongkut's University of Technology Thonburi (KMUTT)
- **Members:**
  - Kanokphathai Tangoon - 66070501064
  - Chinatip Danaipiriya - 66070503415
  - Thapana Liamthonkaow - 66070503416
- **Advisor:** Dr. Santawat Thanyadit

> **To be confirmed:** The official Thai project title, the department's required format, and the data that can realistically be accessed and used.

## 2. Background and Significance

Universities and organizations maintain different types of information about their people and academic activities, including academic programs, courses, projects, research, publications, certifications, skills, and internship or work experience. These data are often distributed across multiple databases or systems, making them difficult to access, understand, and use for decision-making [1].

When information is stored separately, it becomes difficult to understand the expertise of individuals, relationships within an organization, and opportunities for collaboration. This is particularly challenging when searching for suitable researchers or experts for university-industry collaboration, which has been identified as an important research problem [2].

This project proposes A.N.T. (Academic Network & Talent Map Platform), a platform for collecting and visualizing relationships between people, skills, courses, projects, research, publications, certifications, and industry job roles. The platform will use an interactive network graph with a force-directed layout as its primary visualization. This approach can help users explore connections among related academic information and understand the structure of a network [3]-[5].

For example, users can search for the topic of cybersecurity and identify people with related skills. They can then inspect the evidence supporting those skills, such as courses, projects, research, certifications, and relevant work experience, as well as connections to job roles such as SOC Analyst.

KMUTT will be used as the case study for developing and evaluating the platform. The system will be designed so that its data model and architecture can be adapted for other universities or organizations in the future.

## 3. Problems to Be Addressed

1. Information about people, academic activities, skills, and research is presented separately, making relationships between the data difficult to understand.
2. University executives may not have a clear overview of the expertise available within the university.
3. Information barriers make it difficult to identify potential academic and research collaborations.
4. External organizations may have difficulty finding suitable experts for research, funding, or collaboration.
5. Students may have difficulty finding information about university partnerships and relevant academic contacts.

## 4. Objectives

1. To represent people's talents and skills using supporting evidence such as courses, projects, research, publications, certifications, and work or internship experience.
2. To visualize relationships between people, skills, academic activities, research, and industry job roles.
3. To help users identify people with related expertise and understand the information supporting their skills.
4. To compare existing skills with the skills required for specific job roles and identify areas for further development.

## 5. Target Users

> **To be confirmed:** Whether the first version will support all user groups or focus on selected primary users.

- **University executives:** Review an overview of expertise and talent within the university.
- **Lecturers and researchers:** Find potential collaborators or experts in specific areas.
- **Students:** Explore skills, courses, projects, and career-related pathways.
- **External organizations and industry:** Find experts for research, projects, or collaboration.

## 6. Project Scope

### 6.1 Data Scope

- People or personnel included in the case study
- Skills and areas of expertise
- Courses and academic programs
- Projects
- Research and publications
- Certifications and internship or work experience
- Job roles and the skills required for those roles
- Relationships between the different data types

### 6.2 System Scope

- A database for storing entities and relationships
- A backend API for managing and retrieving data
- A frontend application for presenting information
- Search and filtering by data type, topic, or keyword
- An interactive network graph using a force-directed layout
- Detail views for people, skills, supporting evidence, and job roles
- A feature for comparing skills with job-role requirements
- Evaluation of users' understanding and usability of the system

### 6.3 Out of Scope for the Initial Version

- The platform will not represent all KMUTT personnel or all university data.
- The system will not be used to automatically make hiring or personnel evaluation decisions.
- Personal or restricted information will not be disclosed without authorization.
- Integration with production university systems will only be performed when appropriate access and permission are available.

## 7. Methodology

1. Study the problem, user requirements, and related research.
2. Analyze KMUTT and external data sources, including availability, access permissions, and limitations.
3. Design the data structure and the relationship model between nodes and edges.
4. Design the system architecture, database, API, and user interface.
5. Develop data preparation or import, search, filtering, and graph visualization modules.
6. Develop the skill-to-job-role comparison feature.
7. Test the system with sample data and verify the accuracy of the relationships.
8. Evaluate the system with target users and document its limitations.

## 8. Preliminary System Architecture

```text
KMUTT / External Data Sources
            |
    Data Preparation / Import
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

> **To be added:** The actual technologies to be used, such as the frontend framework, backend framework, database, and graph visualization library.

## 9. Expected Results

1. A working A.N.T. platform that visualizes relationships between people, skills, courses, projects, research, publications, and job roles.
2. An interactive network graph that allows users to explore related people, skills, and supporting evidence.
3. A clearer overview of talent and skill relationships within the KMUTT case study.
4. A feature that connects or compares academic expertise with industry-required skills.
5. Evaluation results showing whether users can understand the relationships and information presented by the platform.
6. A documented set of data and system limitations for future improvement or adaptation to other organizations.

## 10. Evaluation Plan

> **Important to define before submission:** The number of participants, recruitment method, tasks, and measurable evaluation criteria.

- Test the correctness of search and filtering functions.
- Verify that graph relationships match the source data.
- Measure the time or success rate required to find a specified person or skill.
- Evaluate users' understanding of the graph and information through questionnaires or task-based evaluation.
- Evaluate usability through a satisfaction questionnaire or the System Usability Scale (SUS), if appropriate.
- Record limitations such as incomplete data, duplicate information, and graph complexity as the number of nodes increases.

## 11. Anticipated Risks and Limitations

- University data may be incomplete or subject to access restrictions.
- Data from different sources may use inconsistent formats and require cleaning.
- Mapping skills to supporting evidence may require defined criteria or expert validation.
- The graph may become difficult to read when the number of nodes and edges increases.
- Privacy, data accuracy, and permission to publish personal information must be carefully considered.

## 12. Preliminary References

[1] A. Briggs and F. Cafaro, “End-User Needs of Fragmented Databases in Higher Education Data Analysis and Decision Making,” *Informatics*, vol. 8, no. 3, p. 42, 2021. doi: [10.3390/informatics8030042](https://doi.org/10.3390/informatics8030042).

[2] Q. Wang, J. Ma, X. Liao, and W. Du, “A Context-Aware Researcher Recommendation System for University-Industry Collaboration on R&D Projects,” *Decision Support Systems*, vol. 103, pp. 46-57, 2017. doi: [10.1016/j.dss.2017.09.001](https://doi.org/10.1016/j.dss.2017.09.001).

[3] C. D. Borromeo, T. K. Schleyer, M. J. Becich, and H. Hochheiser, “Finding Collaborators: Toward Interactive Discovery Tools for Research Network Systems,” *Journal of Medical Internet Research*, vol. 16, no. 11, p. e244, 2014. doi: [10.2196/jmir.3444](https://doi.org/10.2196/jmir.3444).

[4] K. A. M. Aris, C. Ramasamy, T. N. M. Aris, and M. Zolkepli, “Dynamic Force-directed Graph with Weighted Nodes for Scholar Network Visualization,” *International Journal of Advanced Computer Science and Applications*, vol. 13, no. 12, 2022.

[5] M. Jacomy, T. Venturini, S. Heymann, and M. Bastian, “ForceAtlas2, a Continuous Graph Layout Algorithm for Handy Network Visualization Designed for the Gephi Software,” *PLOS ONE*, vol. 9, no. 6, p. e98679, 2014. doi: [10.1371/journal.pone.0098679](https://doi.org/10.1371/journal.pone.0098679).

## 13. Pre-Submission Checklist

- [ ] Confirm the official Thai and English project titles.
- [ ] Define the primary target users.
- [ ] Confirm the data sources and the data that can realistically be accessed.
- [ ] Specify the technologies and system architecture.
- [ ] Define the evaluation method, number of participants, and metrics.
- [ ] Review data permissions, privacy, and ethical considerations.
- [ ] Check the reference format against the department's requirements.
- [ ] Ensure that “talent,” “skill,” “expertise,” and “job role” are used consistently throughout the proposal.
