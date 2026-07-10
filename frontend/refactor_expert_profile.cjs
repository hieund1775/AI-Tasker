const fs = require('fs');

let content = fs.readFileSync('src/app/pages/expert/EditExpertProfile.jsx', 'utf-8');

// 1. Remove CATEGORY_DATA entirely
const startIndex = content.indexOf('const CATEGORY_DATA = {');
const endIndex = content.indexOf('export function EditExpertProfile() {');

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + content.substring(endIndex);
}

// 2. Add state and useEffect for categories/skills
const match = content.match(/export function EditExpertProfile\(\) \{[\s\S]*?\n(.*?)(const \[formData\])/);
if (match && !content.includes('const [allCategories, setAllCategories]')) {
  const newState = `
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
        console.error("Failed to load category data", e);
      }
    }
    loadCategoryData();
  }, []);

  const selectedCatObj = allCategories.find((c) => c.id === formData.category);
  const specializationsList = selectedCatObj ? (selectedCatObj.specializations || []) : [];

`;
  content = content.replace(match[0], `export function EditExpertProfile() {\n${match[1]}${newState}${match[2]}`);
}

// 3. Replace Category mapping
content = content.replace(
`                {Object.keys(CATEGORY_DATA).map((catName) => (
                  <option key={catName} value={catName}>
                    {catName}
                  </option>
                ))}`,
`                {allCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}`
);

// 4. Replace Specialization mapping
content = content.replace(
`                {formData.category &&
                  CATEGORY_DATA[formData.category]?.specializations.map((specName) => (
                    <option key={specName} value={specName}>
                      {specName}
                    </option>
                  ))}`,
`                {specializationsList.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.name}
                    </option>
                  ))}`
);

// 5. Replace Skills mapping
const oldSkills = `                <div className="flex flex-wrap gap-2">
                  {CATEGORY_DATA[formData.category]?.skills[formData.specialization]?.map((skName) => {
                    const isSelected = skills.includes(skName);
                    return (
                      <button
                        key={skName}
                        type="button"
                        onClick={() => toggleSkill(skName)}`;

const newSkills = `                <div className="flex flex-wrap gap-2">
                  {allSkills.map((sk) => {
                    const skName = sk.name;
                    const isSelected = skills.includes(skName);
                    return (
                      <button
                        key={sk.id}
                        type="button"
                        onClick={() => toggleSkill(skName)}`;

content = content.replace(oldSkills, newSkills);

fs.writeFileSync('src/app/pages/expert/EditExpertProfile.jsx', content, 'utf-8');
console.log('Refactored EditExpertProfile.jsx successfully!');
