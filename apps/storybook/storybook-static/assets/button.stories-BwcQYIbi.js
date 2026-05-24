import{n as e}from"./chunk-BEldbCjX.js";import{f as t,n,t as r}from"./iframe-BXALJlt9.js";import{i,r as a}from"./react-BfhiVvyA.js";import{n as o,t as s}from"./button-DLw4OTeN.js";var c,l,u,d,f,p;e((()=>{c=t(),i(),r(),o(),{action:l}=__STORYBOOK_MODULE_ACTIONS__,u=n.meta({args:{children:`Button`,onClick:l(`onClick`)},argTypes:{variant:{control:`inline-radio`,options:[`primary`,`secondary`,`outline`,`ghost`,`destructive`]},size:{control:`inline-radio`,options:[`sm`,`md`,`lg`,`icon`]},disabled:{control:`boolean`},render:{table:{disable:!0}}},component:s,parameters:{layout:`centered`},title:`Atoms/Button`}),d=u.story({}),f=u.story({render:()=>(0,c.jsx)(`div`,{className:`space-y-6`,children:[`primary`,`secondary`,`outline`,`ghost`,`destructive`].map(e=>(0,c.jsxs)(`div`,{className:`flex flex-wrap items-center gap-3`,children:[(0,c.jsx)(s,{size:`sm`,variant:e,children:`Small`}),(0,c.jsx)(s,{size:`md`,variant:e,children:`Medium`}),(0,c.jsx)(s,{size:`lg`,variant:e,children:`Large`}),(0,c.jsx)(s,{size:`icon`,variant:e,children:(0,c.jsx)(a,{"aria-hidden":`true`,size:16})}),(0,c.jsx)(s,{disabled:!0,variant:e,children:`Disabled`})]},e))})}),d.input.parameters={...d.input.parameters,docs:{...d.input.parameters?.docs,source:{originalSource:`meta.story({})`,...d.input.parameters?.docs?.source}}},f.input.parameters={...f.input.parameters,docs:{...f.input.parameters?.docs,source:{originalSource:`meta.story({
  render: () => <div className="space-y-6">
      {(["primary", "secondary", "outline", "ghost", "destructive"] as const).map(variant => <div className="flex flex-wrap items-center gap-3" key={variant}>
          <Component size="sm" variant={variant}>
            Small
          </Component>
          <Component size="md" variant={variant}>
            Medium
          </Component>
          <Component size="lg" variant={variant}>
            Large
          </Component>
          <Component size="icon" variant={variant}>
            <RiArrowRightLine aria-hidden="true" size={16} />
          </Component>
          <Component disabled variant={variant}>
            Disabled
          </Component>
        </div>)}
    </div>
})`,...f.input.parameters?.docs?.source}}},p=[`Default`,`Showcase`]}))();export{d as Default,f as Showcase,p as __namedExportsOrder};