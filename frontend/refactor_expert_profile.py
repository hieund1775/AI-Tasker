import re

with open('src/app/pages/expert/EditExpertProfile.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove CATEGORY_DATA
content = re.sub(r'const CATEGORY_DATA = \{.*?\n\};\n', '', content, flags=re.DOTALL)

# 2. Add state and useEffect for categories/skills
component_start = re.search(r'export function EditExpertProfile\(\) \{.*?\n(.*?)(const \[formData)', content, flags=re.DOTALL)
if component_start:
    new_state = '''
  const [allCategories, setAllCategories] = useState([]);
  const [allSkills, setAllSkills] = useState([]);

  useEffect(() => {
    async function loadCategoryData() {
      try {
        const [cats, sks] = await Promise.all([
          api.categoryTags.getCategories(),
          api.categoryTags.getSkills()
        ]);
        setAllCategories(cats || []);
        setAllSkills(sks || []);
      } catch (e) {
        console.error( Failed to load category data, e);
      }
    }
    loadCategoryData();
  }, []);

  const selectedCatObj = allCategories.find((c) => c.id === formData.category);
  const specializationsList = selectedCatObj ? (selectedCatObj.specializations || []) : [];

'''
    content = content[:component_start.end(1)] + new_state + component_start.group(2) + content[component_start.end(2):]

# 3. Replace Category mapping
content = content.replace(
'''                {Object.keys(CATEGORY_DATA).map((catName) => (
                  <option key={catName} value={catName}>
                    {catName}
                  </option>
                ))}''',
'''                {allCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}'''
)

# 4. Replace Specialization mapping
content = content.replace(
'''                {formData.category &&
                  CATEGORY_DATA[formData.category]?.specializations.map((specName) => (
                    <option key={specName} value={specName}>
                      {specName}
                    </option>
                  ))}''',
'''                {specializationsList.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.name}
                    </option>
                  ))}'''
)

# 5. Replace Skills mapping
old_skills = '''                <div className=\flex flex-wrap gap-2\>
                  {CATEGORY_DATA[formData.category]?.skills[formData.specialization]?.map((skName) => {
                    const isSelected = skills.includes(skName);
                    return (
                      <button
                        key={skName}
                        type=\button\
                        onClick={() => toggleSkill(skName)}'''

new_skills = '''                <div className=\flex flex-wrap gap-2\>
                  {allSkills.map((sk) => {
                    const skName = sk.name;
                    const isSelected = skills.includes(skName);
                    return (
                      <button
                        key={sk.id}
                        type=\button\
                        onClick={() => toggleSkill(skName)}'''

content = content.replace(old_skills, new_skills)

with open('src/app/pages/expert/EditExpertProfile.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print(\Refactored EditExpertProfile.jsx successfully!\)
