import Vue from 'vue'
import App from './App.vue'
import { Form, FormItem, Input, Button, Table, TableColumn, Row, Col, Descriptions, DescriptionsItem, Pagination, Select, Option, Image, InputNumber, Switch } from 'element-ui';

Vue.config.productionTip = false;

Vue.use(Row);
Vue.use(Col);
Vue.use(Form);
Vue.use(FormItem);
Vue.use(Input);
Vue.use(Button);
Vue.use(Table);
Vue.use(TableColumn);
Vue.use(Descriptions);
Vue.use(DescriptionsItem);
Vue.use(Pagination);
Vue.use(Select);
Vue.use(Option);
Vue.use(Image);
Vue.use(InputNumber);
Vue.use(Switch);

new Vue({
	render: h => h(App),
}).$mount('#app');
